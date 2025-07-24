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

  function renderTabela() {
    const tbody = document.getElementById('tbodyNC');
    tbody.innerHTML = '';
    const estadoFiltro = document.getElementById('filterEstado').value;
    const termo = document.getElementById('filterTexto').value.toLowerCase();
    const filtradas = ncList.filter(nc => {
      return (estadoFiltro === 'Todas' || nc.estado === estadoFiltro) &&
             (nc.origem.toLowerCase().includes(termo) || nc.descricao.toLowerCase().includes(termo));
    });
    filtradas.sort((a,b) => new Date(b.dataRegisto) - new Date(a.dataRegisto));
    filtradas.forEach(nc => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2">${nc.id}</td>
        <td class="p-2">${nc.origem}</td>
        <td class="p-2">${nc.descricao}</td>
        <td class="p-2">${new Date(nc.dataRegisto).toLocaleDateString()}</td>
        <td class="p-2">${nc.estado}</td>
        <td class="p-2">
          ${nc.estado === 'Aberta' ? `<button data-id="${nc.id}" class="editar text-blue-500 mr-2">Editar</button><button data-id="${nc.id}" class="fechar text-green-600">Fechar</button>` : ''}
        </td>`;
      tbody.appendChild(tr);
    });
    document.getElementById('statsNC').textContent = `Total: ${ncList.length} | Abertas: ${ncList.filter(n => n.estado === 'Aberta').length}`;
  }

  function abrirModal(nc) {
    document.getElementById('modalForm').classList.remove('hidden');
    document.getElementById('inputOrigem').value = nc ? nc.origem : '';
    document.getElementById('inputDescricao').value = nc ? nc.descricao : '';
    editId = nc ? nc.id : null;
  }

  function fecharModal() {
    document.getElementById('modalForm').classList.add('hidden');
  }

  function adicionarOuEditar() {
    const origem = document.getElementById('inputOrigem').value.trim();
    const descricao = document.getElementById('inputDescricao').value.trim();
    if (!origem || !descricao) return;
    if (editId) {
      const nc = ncList.find(n => n.id === editId && n.estado === 'Aberta');
      if (nc) {
        nc.origem = origem;
        nc.descricao = descricao;
      }
    } else {
      const novo = {
        id: 'nc-' + Date.now(),
        origem,
        descricao,
        dataRegisto: new Date().toISOString(),
        estado: 'Aberta'
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
      nc.dataFecho = new Date().toISOString();
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
