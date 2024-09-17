import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCZBDSCyc1RTENEhxDuVI7Pe7e9Kquxnh0",
    authDomain: "ranking-de-campanhas.firebaseapp.com",
    projectId: "ranking-de-campanhas",
    storageBucket: "ranking-de-campanhas.appspot.com",
    messagingSenderId: "942779149916",
    appId: "1:942779149916:web:6899847a06165b2c624099"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para carregar e exibir o ranking
async function carregarRanking() {
    const rankingRef = doc(db, 'ranking', 'Pontuacao');
    const rankingDoc = await getDoc(rankingRef);
    const ranking = rankingDoc.exists() ? rankingDoc.data() : {};

    const tbody = document.getElementById('vendedoresBody');
    tbody.innerHTML = ''; // Limpa a tabela existente

    let totalPontos = 0;
    let position = 1;

    Object.entries(ranking)
        .sort((a, b) => a[1].position - b[1].position) // Ordena pela posição salva
        .forEach(([vendedor, { position }]) => {
            // Carrega a pontuação dos vendedores
            const pontos = Object.values(vendedorPontuacao).find(v => v.vendedor === vendedor)?.pontos || 0;
            const imgSrc = `/Vendedores/${vendedor}.jpg`; // Caminho da imagem
            let iconeClass = '';
            let space = '';

            if (ranking[vendedor]) {
                const posicaoAnterior = ranking[vendedor].position;
                if (position < posicaoAnterior) {
                    iconeClass = 'arrow_up'; // Subiu
                } else if (position > posicaoAnterior) {
                    iconeClass = 'arrow_down'; // Desceu
                }
                // Adiciona espaço invisível para vendedores que não mudaram de posição
                if (position === posicaoAnterior) {
                    space = '<span class="invisible-space"></span>';
                }
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${position}</td>
                <td>
                    <div>
                        ${iconeClass ? `<span class="material-symbols-outlined ${iconeClass}">${iconeClass === 'arrow_up' ? 'arrow_upward' : 'arrow_downward'}</span>` : ''}
                        ${space}
                        <img src="${imgSrc}" alt="${vendedor}" onError="this.onerror=null;this.src='/Vendedores/default.jpg';"> 
                        ${vendedor}
                    </div>
                </td>
                <td>${pontos}</td>
            `;
            tbody.appendChild(row);
            totalPontos += pontos;
            position++;
        });

    // Atualiza o total de pontos
    document.getElementById('totalPontos').textContent = totalPontos;
}

// Função para processar e salvar os dados da planilha
async function processarPlanilha(file) {
    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Pega a primeira aba da planilha
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Verifica se a planilha possui as colunas esperadas
            const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
            if (!headers.includes('VENDEDOR') || !headers.includes('DESCRIÇÃO DO PRODUTO') || !headers.includes('QTD. FATUR')) {
                alert('A planilha deve conter as colunas "VENDEDOR", "DESCRIÇÃO DO PRODUTO" e "QTD. FATUR".');
                return;
            }

            // Converte a planilha em JSON
            const json = XLSX.utils.sheet_to_json(worksheet);

            // Dicionário para armazenar as pontuações dos vendedores
            const vendedorPontuacao = {};

            json.forEach(row => {
                // Extraindo o nome do vendedor após o hífen
                const vendedorCompleto = row['VENDEDOR'];
                const vendedorNome = vendedorCompleto.split('-').pop().trim();
                const descricao = row['DESCRIÇÃO DO PRODUTO'];
                const qtdFatur = row['QTD. FATUR'];

                let pontos = 0;
                if (descricao.includes('BOMBA') || descricao.includes('PRESSURIZADOR')) {
                    pontos = 5;
                } else {
                    pontos = 1;
                }

                const totalPontos = pontos * qtdFatur;

                if (vendedorPontuacao[vendedorNome]) {
                    vendedorPontuacao[vendedorNome] += totalPontos;
                } else {
                    vendedorPontuacao[vendedorNome] = totalPontos;
                }
            });

            // Recupera o ranking anterior do Firestore
            const rankingRef = doc(db, 'ranking', 'Pontuacao');
            const rankingDoc = await getDoc(rankingRef);
            const rankingAnterior = rankingDoc.exists() ? rankingDoc.data() : {};

            // Ordena e atualiza a tabela com o ranking
            const tbody = document.getElementById('vendedoresBody');
            tbody.innerHTML = ''; // Limpa a tabela existente
            let totalPontos = 0;
            let position = 1;

            Object.entries(vendedorPontuacao)
                .sort((a, b) => b[1] - a[1])
                .forEach(([vendedor, pontos]) => {
                    const imgSrc = `/Vendedores/${vendedor}.jpg`; // Caminho da imagem
                    let iconeClass = '';
                    let space = '';

                    if (rankingAnterior[vendedor]) {
                        const posicaoAnterior = rankingAnterior[vendedor].position;
                        if (position < posicaoAnterior) {
                            iconeClass = 'arrow_up'; // Subiu
                        } else if (position > posicaoAnterior) {
                            iconeClass = 'arrow_down'; // Desceu
                        }
                        // Adiciona espaço invisível para vendedores que não mudaram de posição
                        if (position === posicaoAnterior) {
                            space = '<span class="invisible-space"></span>';
                        }
                    }

                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${position}</td>
                        <td>
                            <div>
                                ${iconeClass ? `<span class="material-symbols-outlined ${iconeClass}">${iconeClass === 'arrow_up' ? 'arrow_upward' : 'arrow_downward'}</span>` : ''}
                                ${space}
                                <img src="${imgSrc}" alt="${vendedor}" onError="this.onerror=null;this.src='/Vendedores/default.jpg';"> 
                                ${vendedor}
                            </div>
                        </td>
                        <td>${pontos}</td>
                    `;
                    tbody.appendChild(row);
                    totalPontos += pontos;
                    position++;
                });

            // Salva o novo ranking no Firestore
            const rankingParaSalvar = Object.entries(vendedorPontuacao)
                .sort((a, b) => b[1] - a[1])
                .reduce((acc, [vendedor, pontos], index) => {
                    acc[vendedor] = { position: index + 1 };
                    return acc;
                }, {});
            await setDoc(rankingRef, rankingParaSalvar);

            // Atualiza o total de pontos
            document.getElementById('totalPontos').textContent = totalPontos;
        } catch (error) {
            console.error('Erro ao processar a planilha:', error);
            alert('Ocorreu um erro ao processar a planilha. Verifique o console para mais detalhes.');
        }
    };

    reader.readAsArrayBuffer(file);
}

// Carregar o ranking ao iniciar a página
document.addEventListener('DOMContentLoaded', carregarRanking);

document.getElementById('uploadPlanilha').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        processarPlanilha(file);
    }
});
