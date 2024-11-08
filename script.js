import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc, increment } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBGzGqcgOZNYrFq-1pWv6ds_X69S2Anqk8",
  authDomain: "avaliacoes-c586a.firebaseapp.com",
  projectId: "avaliacoes-c586a",
  storageBucket: "avaliacoes-c586a.firebasestorage.app",
  messagingSenderId: "430101660288",
  appId: "1:430101660288:web:8f5a4483eb277cf84c9c65"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Dados dos vendedores com o caminho para as fotos, todos começam com 0 pontos
const vendedores = [
  { nome: 'Wesley', pontos: 0, foto: 'Vendedores/Wesley Sa.jpg', id: 'wesley' },
  { nome: 'Murilo', pontos: 0, foto: 'Vendedores/Murilo Henrique.jpg', id: 'murilo' },
  { nome: 'Valéria', pontos: 0, foto: 'Vendedores/valeria.jpg', id: 'valeria' },
  { nome: 'Mateus', pontos: 0, foto: '', id: 'mateus' },
  { nome: 'Leandro', pontos: 0, foto: '', id: 'leandro' },
  { nome: 'Tatiane', pontos: 0, foto: 'Vendedores/tatiane.jpg', id: 'tatiane' },
  { nome: 'Deives', pontos: 0, foto: 'Vendedores/deives.jpg', id: 'deives' },
  { nome: 'Gustavo', pontos: 0, foto: 'Vendedores/gustavo.jpg', id: 'gustavo' },
  { nome: 'Victor', pontos: 0, foto: 'Vendedores/victor.jpg', id: 'victor' }
];

// Função para carregar os pontos dos vendedores do Firestore
async function carregarPontosDosVendedores() {
  for (let i = 0; i < vendedores.length; i++) {
    const vendedorRef = doc(db, "vendedores", vendedores[i].id);
    const vendedorDoc = await getDoc(vendedorRef);

    if (vendedorDoc.exists()) {
      vendedores[i].pontos = vendedorDoc.data().pontos || 0;
    } else {
      console.log("Vendedor não encontrado: ", vendedores[i].id);
    }
  }

  gerarRanking(); // Após carregar os pontos, gera o ranking
}

// Função para atualizar ou criar o documento no Firestore
async function atualizarPontosFirestore(vendedorId, pontos) {
  const vendedorRef = doc(db, "vendedores", vendedorId);
  const vendedorDoc = await getDoc(vendedorRef);

  // Se o documento não existir, cria-o com os pontos
  if (!vendedorDoc.exists()) {
    // Cria o documento com pontos iniciais, se necessário
    await setDoc(vendedorRef, { pontos: pontos });  // Usa setDoc em vez de updateDoc
  } else {
    // Se o documento existir, atualiza os pontos
    await updateDoc(vendedorRef, { pontos: increment(pontos) });
  }
}



// Função para gerar o ranking
function gerarRanking() {
  const rankingList = document.getElementById('ranking-list');
  rankingList.innerHTML = '';

  // Ordena os vendedores por pontos em ordem decrescente
  vendedores.sort((a, b) => b.pontos - a.pontos);

  vendedores.forEach((vendedor, index) => {
    // Cria o item do ranking
    const listItem = document.createElement('li');
    listItem.classList.add('ranking-item');
    if (index === 0) listItem.classList.add('first-place');

    // Ícone de posição
    const positionIcon = document.createElement('div');
    positionIcon.classList.add('position');
    positionIcon.textContent = index + 1;

    // Foto do vendedor
    const foto = document.createElement('img');
    foto.src = vendedor.foto;
    foto.alt = `Foto de ${vendedor.nome}`;
    foto.style.width = '50px';
    foto.style.height = '50px';
    foto.style.borderRadius = '50%';
    foto.style.marginRight = '10px';

    // Nome do vendedor
    const name = document.createElement('div');
    name.classList.add('name');
    name.textContent = vendedor.nome;

    // Pontuação do vendedor
    const points = document.createElement('div');
    points.classList.add('points');
    points.innerHTML = `<span class="icon">⭐</span> ${vendedor.pontos} pontos`;

    // Botões para adicionar ou diminuir pontos (visíveis apenas para administrador)
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('button-container');
    
    // Botão para aumentar pontos
    const addButton = document.createElement('button');
    addButton.classList.add('control-button');
    addButton.innerHTML = '<span class="material-icons">add</span>'; // Ícone de adicionar
    addButton.addEventListener('click', async () => {
      if (document.body.classList.contains('admin-mode')) {
        vendedor.pontos += 1; // Atualiza localmente primeiro
        await atualizarPontosFirestore(vendedor.id, 1); // Atualiza no Firestore
        gerarRanking(); // Atualiza o ranking após adicionar pontos
      }
    });

    // Botão para diminuir pontos
    const removeButton = document.createElement('button');
    removeButton.classList.add('control-button');
    removeButton.innerHTML = '<span class="material-icons">remove</span>'; // Ícone de diminuir
    removeButton.addEventListener('click', async () => {
      if (document.body.classList.contains('admin-mode') && vendedor.pontos > 0) {
        vendedor.pontos -= 1; // Atualiza localmente primeiro
        await atualizarPontosFirestore(vendedor.id, -1); // Atualiza no Firestore
        gerarRanking(); // Atualiza o ranking após diminuir pontos
      }
    });

    // Adiciona os botões ao container
    buttonContainer.appendChild(addButton);
    buttonContainer.appendChild(removeButton);

    // Monta o item do ranking
    listItem.appendChild(positionIcon);
    listItem.appendChild(foto);
    listItem.appendChild(name);
    listItem.appendChild(points);
    listItem.appendChild(buttonContainer);
    rankingList.appendChild(listItem);
  });
}

// Alterna para o modo administrador ao pressionar a tecla "A"
document.addEventListener('keydown', (event) => {
  if (event.key === 'A' || event.key === 'a') {
    document.body.classList.toggle('admin-mode');
  }
});

// Carrega os pontos dos vendedores e gera o ranking
carregarPontosDosVendedores();
