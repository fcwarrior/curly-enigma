(function(){
  const STORAGE_KEY = 'nc-registos';
  let ncList = [];
  let editId = null;

  function carregarNC() {
    const data = localStorage.getItem(STORAGE_KEY);
    ncList = data ? JSON.parse(data) : [];
  }

  function salvarNC() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ncList));
  }

  function gerarNumero() {
    const ano = new Date().getFullYear();
    const max = ncList.reduce((acc, n) => {
      const m = /^\d+/.exec(n.numero);
      const num = m ? parseInt(m[0], 10) : 0;
      return Math.max(acc, num);
    }, 0);
    return `${max + 1}/${ano}`;
  }

  function renderTabela() {
    const tbody = document.getElementById('tbodyNC');
    tbody.innerHTML = '';
    const estadoFiltro = document.getElementById('filterEstado').value;
    const origemFiltro = document.getElementById('filterOrigem').value;
    const termo = document.getElementById('filterTexto').value.toLowerCase();
    const dataInicio = document.getElementById('filterDataInicio').value;
    const dataFim = document.getElementById('filterDataFim').value;

    const filtradas = ncList.filter(nc => {
      const data = new Date(nc.dataRegisto);
      return (!estadoFiltro || nc.estado === estadoFiltro) &&
             (!origemFiltro || nc.origens.includes(origemFiltro)) &&
             (!dataInicio || data >= new Date(dataInicio)) &&
             (!dataFim || data <= new Date(dataFim)) &&
             (nc.origens.join(' ').toLowerCase().includes(termo) || nc.descricao.toLowerCase().includes(termo));
    });
    filtradas.sort((a,b) => new Date(b.dataRegisto) - new Date(a.dataRegisto));
    filtradas.forEach(nc => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2">${nc.numero}</td>
        <td class="p-2">${nc.origens.join(', ')}</td>
        <td class="p-2">${nc.descricao}</td>
        <td class="p-2">${new Date(nc.dataRegisto).toLocaleDateString()}</td>
        <td class="p-2">${nc.estado}</td>
        <td class="p-2">
          <button data-id="${nc.id}" class="editar text-blue-500 mr-2">Editar</button>
          ${nc.estado === 'Aberta' ? `<button data-id="${nc.id}" class="fechar text-green-600">Fechar</button>` : ''}
        </td>`;
      tbody.appendChild(tr);
    });
    document.getElementById('statsNC').textContent = `Total: ${ncList.length} | Abertas: ${ncList.filter(n => n.estado === 'Aberta').length}`;
  }

  function abrirModal(nc) {
    document.getElementById('modalForm').classList.remove('hidden');
    document.getElementById('inputNumero').value = nc ? nc.numero : gerarNumero();
    const origemSelect = document.getElementById('inputOrigem');
    Array.from(origemSelect.options).forEach(opt => opt.selected = false);
    if (nc && nc.origens) {
      nc.origens.forEach(o => {
        const option = Array.from(origemSelect.options).find(op => op.value === o);
        if (option) option.selected = true;
      });
    }
    document.getElementById('inputDescricao').value = nc ? nc.descricao : '';
    document.getElementById('inputRubricaRegisto').value = nc ? nc.rubricaRegisto || '' : '';
    document.getElementById('inputAnaliseCausa').value = nc ? nc.analiseCausa || '' : '';
    document.getElementById('inputCorrecao').value = nc ? nc.correcao || '' : '';
    document.getElementById('inputAcaoCorretiva').value = nc ? nc.acaoCorretiva || '' : '';
    document.getElementById('inputAcompanhamento').value = nc ? nc.acompanhamento || '' : '';
    document.getElementById('inputAvaliacao').value = nc ? nc.avaliacao || '' : '';
    document.getElementById('inputNcEncerrada').checked = nc ? (nc.encerramento && nc.encerramento.ncroEncerrado) : false;
    document.getElementById('inputRubricaEnc').value = nc && nc.encerramento ? nc.encerramento.rubrica || '' : '';
    document.getElementById('inputDataEnc').value = nc && nc.encerramento ? (nc.encerramento.data || '') : '';
    editId = nc ? nc.id : null;
  }

  function fecharModal() {
    document.getElementById('modalForm').classList.add('hidden');
  }

  function adicionarOuEditar() {
    const numero = document.getElementById('inputNumero').value.trim();
    const origemSelect = document.getElementById('inputOrigem');
    const origens = Array.from(origemSelect.selectedOptions).map(o => o.value);
    const descricao = document.getElementById('inputDescricao').value.trim();
    const rubricaRegisto = document.getElementById('inputRubricaRegisto').value.trim();
    if (!numero || origens.length === 0 || !descricao || !rubricaRegisto) {
      alert('Preencha os campos obrigatórios');
      return;
    }
    const analiseCausa = document.getElementById('inputAnaliseCausa').value.trim();
    const correcao = document.getElementById('inputCorrecao').value.trim();
    const acaoCorretiva = document.getElementById('inputAcaoCorretiva').value.trim();
    const acompanhamento = document.getElementById('inputAcompanhamento').value.trim();
    const avaliacao = document.getElementById('inputAvaliacao').value.trim();
    const enc = {
      ncroEncerrado: document.getElementById('inputNcEncerrada').checked,
      rubrica: document.getElementById('inputRubricaEnc').value.trim(),
      data: document.getElementById('inputDataEnc').value
    };

    if (editId) {
      const nc = ncList.find(n => n.id === editId);
      if (nc) {
        nc.numero = numero;
        nc.origens = origens;
        nc.descricao = descricao;
        nc.rubricaRegisto = rubricaRegisto;
        nc.analiseCausa = analiseCausa;
        nc.correcao = correcao;
        nc.acaoCorretiva = acaoCorretiva;
        nc.acompanhamento = acompanhamento;
        nc.avaliacao = avaliacao;
        nc.encerramento = enc;
        nc.estado = enc.ncroEncerrado ? 'Fechada' : 'Aberta';
      }
    } else {
      const novo = {
        id: 'nc-' + Date.now(),
        numero,
        origens,
        descricao,
        dataRegisto: new Date().toISOString(),
        rubricaRegisto,
        analiseCausa,
        correcao,
        acaoCorretiva,
        acompanhamento,
        avaliacao,
        encerramento: enc,
        estado: enc.ncroEncerrado ? 'Fechada' : 'Aberta'
      };
      ncList.push(novo);
    }
    salvarNC();
    fecharModal();
    renderTabela();
  }

  function fecharNC(id) {
    const nc = ncList.find(n => n.id === id && n.estado === 'Aberta');
    if (nc) {
      nc.estado = 'Fechada';
      nc.encerramento = { ncroEncerrado: true, rubrica: '', data: new Date().toISOString() };
      salvarNC();
      renderTabela();
    }
  }

  function exportarJSON() {
    const blob = new Blob([JSON.stringify(ncList, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nc-dados.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importarJSON(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const dados = JSON.parse(e.target.result);
        if (Array.isArray(dados)) {
          ncList = dados;
          salvarNC();
          renderTabela();
        }
      } catch(err) {
        console.error('JSON inválido', err);
      }
    };
    reader.readAsText(file);
  }

  document.getElementById('btnNovaNC').addEventListener('click', () => abrirModal());
  document.getElementById('btnFecharModal').addEventListener('click', fecharModal);
  document.getElementById('btnGuardar').addEventListener('click', adicionarOuEditar);
  document.getElementById('btnExportar').addEventListener('click', exportarJSON);
  document.getElementById('btnImportar').addEventListener('click', () => document.getElementById('fileImport').click());
  document.getElementById('fileImport').addEventListener('change', e => {
    if (e.target.files.length) importarJSON(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('filterEstado').addEventListener('change', renderTabela);
  document.getElementById('filterOrigem').addEventListener('change', renderTabela);
  document.getElementById('filterDataInicio').addEventListener('change', renderTabela);
  document.getElementById('filterDataFim').addEventListener('change', renderTabela);
  document.getElementById('filterTexto').addEventListener('input', renderTabela);
  document.getElementById('tbodyNC').addEventListener('click', e => {
    const id = e.target.dataset.id;
    if (e.target.classList.contains('editar')) {
      const nc = ncList.find(n => n.id === id);
      abrirModal(nc);
    } else if (e.target.classList.contains('fechar')) {
      fecharNC(id);
    }
  });

  carregarNC();
  renderTabela();
})();
