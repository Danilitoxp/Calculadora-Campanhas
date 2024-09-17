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

let vendedorFaturamento = {};

// Função para processar a planilha e somar o faturamento
export async function processarPlanilha(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Pega a primeira aba da planilha
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Verifica se a planilha possui a coluna esperada
            const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
            if (!headers.includes('VENDEDOR') || !headers.includes('FATURAMENTO')) {
                alert('A planilha deve conter as colunas "VENDEDOR" e "FATURAMENTO".');
                return;
            }

            // Converte a planilha em JSON
            const json = XLSX.utils.sheet_to_json(worksheet);

            json.forEach(row => {
                const vendedorCompleto = row['VENDEDOR'];
                const vendedorNome = vendedorCompleto.split('-').pop().trim();
            
                // Obtém o valor de FATURAMENTO diretamente
                let faturamentoStr = row['FATURAMENTO'] ? row['FATURAMENTO'].toString() : '';
                
                // Remove o símbolo de real e substitui separador de decimal e milhar
faturamentoStr = faturamentoStr.replace(/R\$/g, '').trim(); // Remove 'R$' e espaços
faturamentoStr = faturamentoStr.replace(/\./g, '').replace(',', '.'); // Remove milhar e substitui decimal

                // Verifica se o valor é válido
                let faturamento = parseFloat(faturamentoStr);
                if (isNaN(faturamento) || faturamento > 1e6) { // Considera valores acima de 1 milhão como inválidos
                    console.error(`Valor inválido ou muito grande encontrado: "${faturamentoStr}"`);
                    faturamento = 0;
                }

                console.log(`Vendedor: ${vendedorNome}, Faturamento: ${faturamentoStr}, Valor convertido: ${faturamento}`);

                if (vendedorFaturamento[vendedorNome]) {
                    vendedorFaturamento[vendedorNome] += faturamento;
                } else {
                    vendedorFaturamento[vendedorNome] = faturamento;
                }
            });

            // Exibir ranking automaticamente
            exibirRanking();
        } catch (error) {
            console.error('Erro ao processar a planilha:', error);
            alert('Ocorreu um erro ao processar a planilha. Verifique o console para mais detalhes.');
        }
    };

    reader.readAsArrayBuffer(file);
}

// Função para formatar valores em reais
function formatarParaReais(valor) {
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Função para exibir o ranking
async function exibirRanking() {
    // Recupera o ranking anterior do Firestore
    const rankingRef = doc(db, 'ranking', 'faturamento');
    const rankingDoc = await getDoc(rankingRef);
    const rankingAnterior = rankingDoc.exists() ? rankingDoc.data() : {};

    // Ordena e atualiza a tabela com o ranking
    const tbody = document.getElementById('vendedoresBody');
    tbody.innerHTML = ''; // Limpa a tabela existente
    let totalFaturamento = 0;
    let position = 1;

    Object.entries(vendedorFaturamento)
        .sort((a, b) => b[1] - a[1]) // Ordena pelo faturamento
        .forEach(([vendedor, faturamento]) => {
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
                <td>${formatarParaReais(faturamento)}</td>
            `;
            tbody.appendChild(row);
            totalFaturamento += faturamento;
            position++;
        });

    // Salva o novo ranking no Firestore
    const rankingParaSalvar = Object.entries(vendedorFaturamento)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [vendedor, faturamento], index) => {
            acc[vendedor] = { position: index + 1 };
            return acc;
        }, {});
    await setDoc(rankingRef, rankingParaSalvar);

    // Atualiza o total de faturamento
    document.getElementById('totalFaturamento').textContent = formatarParaReais(totalFaturamento);
}

// Adiciona a função ao objeto global `window`
window.processarPlanilha = processarPlanilha;
