# Meu Sommelier — Escopo Técnico Funcional

| Campo | Valor |
|---|---|
| Projeto | Meu Sommelier |
| Versão | 2.1 |
| Data | 15/11/2026 |
| Elaborado por | Agent (Governador), em entrevista com sledt1006p01@imersao.mitralab.io |
| Status | Escopo completo |

## 2. Objetivo

Meu Sommelier é uma adega pessoal de vinhos inspirada no Vivino, de uso exclusivo da dona (1 usuária). Ela cadastra os vinhos que tem, controla o estoque de garrafas separado por safra, registra quando cada safra deve ser bebida (janela de consumo) e recebe alertas dentro do app quando uma safra entra na janela, chega ao auge ou está saindo dela. Também guarda a sua avaliação pessoal e registros manuais de avaliações externas (crítica profissional e comunidade), com o link da fonte, sem copiar conteúdo de sites.

Problema que resolve: hoje a dona não tem um lugar único para saber quantas garrafas tem de cada safra, qual beber primeiro e o que dizem sobre cada vinho; garrafas passam do ponto sem ninguém perceber.

Resultado esperado: abrir o app e ver, em segundos, o tamanho da adega, o que beber logo e os alertas novos; e registrar entradas e baixas em poucos toques no celular.

Referência: o app já existe em outra plataforma (Infusion), com as mesmas funções; este escopo descreve o produto para ser construído no Mitra.

## 3. Atores e personas

- Dona da adega (usuária): cadastra vinhos (à mão ou pela foto do rótulo), safras e fontes; registra compras, presentes e garrafas bebidas; preenche a janela de consumo; avalia de 0 a 100; lê e marca alertas; conversa com o sommelier por texto ou áudio; exporta tudo em planilha. Usa muito pelo celular. Vê e altera só a própria adega. Usuária de teste: 'Adega da Mitra'.
- Administradora: cria as usuárias novas, cada uma com adega própria e vazia.
- Leitor de rótulo (IA, Gemini): recebe a foto e devolve sugestões para os campos do vinho. Não grava nada sozinho.
- Sommelier virtual (IA, Gemini, no chat): ouve ou lê o que a usuária vai comer, consulta só a adega dela e indica garrafas dela ou o tipo de vinho a comprar. Só lê; não altera nada.
- Rotina automática de alertas (sistema): compara a janela de cada safra com estoque > 0 com o ano atual e gera os alertas de início, auge e saindo da janela, sem duplicar.

Não há adega compartilhada, visitante nem acesso público.

## 4. Pré-condições

- Chave de API do Google Gemini (aistudio.google.com › Get API key), para leitura do rótulo, sommelier e transcrição do áudio. Pode ser a mesma chave do Gemini já usada no Monitor de Canais do YouTube, ou uma nova. A cota grátis do Google basta para uso pessoal.
- A chave é guardada pelo cartão seguro do Mitra, nunca digitada no chat nem no app.
- Usuária de teste 'Adega da Mitra' criada no produto, com login.
- Base de teste carregada com 8 vinhos de exemplo (com safras, janelas, movimentações e avaliações) na adega da usuária de teste.
- Nenhuma fonte externa é obrigatória para o app funcionar.

## 5. Glossário

- Vinho: o rótulo (nome, produtor, país, região, uva, tipo, foto opcional, notas pessoais). Não tem ano.
- Safra: um ano específico de um vinho. Tem estoque, janela de consumo, movimentações, avaliações e alertas próprios.
- Estoque: quantidade de garrafas de uma safra.
- Movimentação: entrada ou baixa de garrafas de uma safra, com quantidade, data e motivo (compra, presente, jantar, outro).
- Beber logo: atalho que registra a baixa de 1 garrafa.
- Janela de consumo: início, auge e fim do período ideal para beber uma safra, preenchidos pela dona.
- Status da janela: ainda cedo, início da janela, auge, saindo da janela (beber logo), passou.
- Alerta: aviso dentro do app de que uma safra entrou no início, no auge ou está saindo da janela; fica lido ou não lido.
- Avaliação pessoal: nota e comentário da dona para uma safra.
- Avaliação externa: registro manual de uma nota de terceiros (fonte, avaliador, nota original, escala, tipo profissional ou comunidade, data, URL).
- Fonte: site de referência (ex.: Vivino, Wine Spectator) com categoria, URL e condições de uso.
- Escala: faixa da nota original (0–5 ou 0–100).

## 6. Regras de negócio

RN-01 Safras não se misturam: estoque, janela, avaliações e alertas pertencem à safra. Ex.: Malbec X 2019 com 4 garrafas e Malbec X 2021 com 2 garrafas aparecem separados; o total do vinho é 6, mas cada safra mantém o seu.
RN-02 Um vinho não pode ter duas safras com o mesmo ano. Ex.: cadastrar 2019 de novo no Malbec X é recusado com aviso.
RN-03 Estoque nunca fica negativo. Ex.: safra com 1 garrafa; baixa de 2 é recusada; baixa de 1 deixa 0.
RN-04 Toda mudança de estoque gera uma movimentação no histórico (tipo, quantidade, motivo, data). Ex.: entrada de 6 por compra em 10/03 e baixa de 1 por jantar em 15/04 deixam estoque 5 e 2 linhas no histórico.
RN-05 Beber logo = baixa de 1 garrafa com motivo 'beber logo'.
RN-06 Janela por ANO: início ≤ auge ≤ fim, todos anos inteiros; senão o cadastro é recusado. Ex.: início 2024, auge 2023 é recusado.
RN-07 Status pelo ano atual. Com início 2024, auge 2027, fim 2032: até 2023 'ainda cedo'; 2024–2026 'na janela'; 2027 'auge'; 2028–2031 'na janela'; 2032 (último ano da janela) 'saindo da janela – beber logo'; a partir de 2033 'passou'. A ficha mostra também quantos anos faltam para o fim (ex.: em 2031 'falta 1 ano'). Se auge = fim, vale 'auge' e o aviso de último ano.
RN-08 Alertas: gerados só para safras com estoque > 0, um por safra e tipo (início da janela, auge, saindo da janela). Ex.: se o alerta de auge da safra 2019 já existe, não é criado outro. Alerta por e-mail fica fora desta versão.
RN-09 Alerta novo nasce não lido; a usuária marca um ou todos como lidos.
RN-10 Avaliação pessoal em 0 a 100. Avaliação externa preserva a nota original e a escala; para indicadores, normaliza para 0–100. Ex.: 4,2 em 0–5 = 84; 92 em 0–100 = 92.
RN-11 Indicadores separados por safra: média pessoal, média profissional e média de comunidade, nunca misturados. Ex.: profissional 92 e 90 → 91; comunidade 4,0/5 → 80.
RN-12 Sem scraping nem acesso automático a sites: avaliações externas e fontes só por cadastro manual; o app funciona com zero fontes.
RN-13 Excluir vinho exclui suas safras, movimentações, avaliações e alertas, com confirmação. Excluir uma fonte usada em avaliações mantém as avaliações, que ficam sem fonte (o nome e a URL originais continuam gravados no registro).
RN-14 Cada usuária tem a sua adega separada: vê e altera só os próprios vinhos, fontes, alertas e conversas com o sommelier. Sem adega compartilhada, visitante ou tela pública. Usuárias novas são criadas pela administradora (sem cadastro aberto). Nesta versão há 1 usuária de teste, 'Adega da Mitra', com 8 vinhos de exemplo de tipos e status de janela diferentes.
RN-15 Leitura do rótulo por foto: a usuária tira ou envia a foto; a IA sugere nome, produtor, país, região, uva, tipo e safra; o formulário abre preenchido e nada é gravado sem ela revisar e salvar. Campo não reconhecido fica vazio. A foto fica guardada no vinho.
RN-16 Provedor de IA (rótulo, sommelier e transcrição do áudio): Google Gemini, com uma chave de API só. Se o Gemini falhar ou passar da cota, o app avisa (rótulo: abre o cadastro manual com a foto anexada; sommelier: pede para tentar de novo). A chave fica no cofre, nunca na tela.
RN-17 Sommelier virtual por chat: a usuária escreve ou fala por áudio (o áudio é transcrito e a transcrição aparece na conversa) o que vai comer ou a ocasião. O sommelier responde em texto: (a) primeiro procura nas garrafas DELA com estoque > 0 e indica até 3, com safra, quantidade e status da janela, priorizando as que estão no auge ou saindo da janela; (b) se nenhuma combinar, indica o tipo de vinho a comprar (uva, estilo, região), deixando claro que não está na adega. Ex.: 'risoto de cogumelos' com Pinot Noir 2019 (3 garrafas, auge) na adega → indica essa garrafa primeiro.
RN-18 O sommelier só lê a adega: não dá baixa, não cadastra e não altera nada. Na indicação de uma garrafa da adega, oferece os botões 'Abrir ficha' e 'Beber logo' (este passa pela confirmação normal da RN-05).
RN-19 O sommelier nunca inventa garrafa: só cita como 'da sua adega' vinhos que existem no cadastro da usuária, com o estoque real do momento.
RN-20 O histórico de conversas com o sommelier fica guardado por usuária e pode ser apagado por ela.

## 7. Fluxo principal (caminho feliz)

1. A usuária entra no app (login) e cai no Início: total de vinhos, safras e garrafas, lista 'beber logo' e alertas não lidos.
2. Na Adega, busca por nome, produtor, uva ou região e filtra por tipo, país e status da janela; a lista carrega aos poucos ao rolar.
3. Toca em 'Novo vinho' e escolhe: 'Ler rótulo' (tira ou envia a foto) ou 'Cadastrar à mão'.
4. Em 'Ler rótulo', a IA devolve as sugestões e o formulário abre preenchido; ela revisa, corrige e salva. Em 'à mão', preenche os campos e a foto opcional.
5. Na ficha do vinho, adiciona uma safra (ano) com a quantidade inicial de garrafas (a safra lida no rótulo já vem sugerida); o app grava a entrada no histórico.
6. Preenche a janela de consumo da safra (ano de início, auge e fim); o status e os anos que faltam aparecem na hora.
7. Ao comprar ou ganhar garrafas, registra entrada com motivo; ao beber, usa 'Beber logo' ou registra baixa com motivo.
8. Registra a avaliação pessoal (0 a 100 e comentário) da safra.
9. Em Fontes, cadastra sites de referência; na ficha, em 'O que estão dizendo sobre este vinho', registra avaliações externas à mão e abre o link de origem.
10. A ficha mostra os indicadores pessoal, profissional e comunidade por safra.
11. Na tela Sommelier (chat), ela escreve ou grava um áudio: 'vou jantar risoto de cogumelos'. O áudio vira texto na conversa.
12. O sommelier responde com até 3 garrafas da adega dela (safra, quantidade, status da janela), ou com o tipo de vinho a comprar; ela toca em 'Abrir ficha' ou 'Beber logo'.
13. A rotina de alertas gera avisos de início, auge e saindo da janela; na aba Alertas, ela filtra por tipo, abre a ficha e marca um ou todos como lidos.
14. Quando quiser, toca em 'Exportar tudo' e baixa uma planilha com uma aba por área (vinhos, safras, movimentações, avaliações, fontes, alertas).

## 8. Fluxos alternativos e exceções

FA-01 Baixa maior que o estoque: o app recusa e mostra quantas garrafas há.
FA-02 Safra repetida no mesmo vinho: o app recusa e leva à safra existente.
FA-03 Janela fora de ordem: o app recusa e aponta o campo.
FA-04 Safra sem janela preenchida: status 'sem janela'; não gera alerta.
FA-05 Estoque zerado: a safra continua na ficha e no histórico, sai de 'beber logo', não gera alertas novos e não é indicada pelo sommelier.
FA-06 Nenhuma fonte cadastrada: avaliações externas podem ser registradas sem fonte, e o app funciona normalmente.
FA-07 Foto inválida ou grande demais: o app recusa o arquivo e mantém o cadastro sem foto.
FA-08 Falha ao gravar: a tela volta ao estado anterior e avisa.
FA-09 Excluir vinho ou safra: pede confirmação mostrando quantas garrafas e registros serão apagados.
FA-10 Gemini fora do ar, lento ou sem cota: o app avisa em linguagem simples e o resto do app (adega, estoque, alertas) continua funcionando.
FA-11 Foto ilegível: o app avisa e abre o formulário vazio, com a foto anexada.
FA-12 A IA reconhece só parte do rótulo: preenche o que reconheceu e deixa o resto vazio.
FA-13 O rótulo lido parece um vinho já cadastrado (mesmo nome e produtor): o app avisa e oferece abrir o vinho existente para só adicionar a safra.
FA-14 Adega vazia ou sem garrafa que combine: o sommelier diz isso e indica o tipo de vinho a comprar.
FA-15 Áudio que não dá para entender: o sommelier pede para repetir ou escrever.
FA-16 Pergunta fora do assunto vinho e comida: o sommelier responde que só ajuda com a adega e harmonização.

## 9. Critérios de aceite

CA-01 Cadastrar um vinho à mão com nome, produtor, país, região, uva, tipo, notas e foto, e encontrá-lo na Adega pela busca por nome e por uva.
CA-02 Adicionar safras 2019 (4 garrafas) e 2021 (2 garrafas) ao mesmo vinho: a ficha mostra as duas separadas e total 6.
CA-03 Tentar criar de novo a safra 2019 é recusado.
CA-04 Baixa de 5 garrafas na safra 2019 (estoque 4) é recusada; baixa de 1 deixa 3.
CA-05 Cada entrada e baixa aparece no histórico da safra com data, quantidade e motivo.
CA-06 'Beber logo' reduz o estoque em 1 e registra a movimentação.
CA-07 Janela com auge antes do início é recusada.
CA-08 Com janela 2024 / 2027 / 2032, o status muda conforme o ano atual exatamente como na RN-07, e em 2032 aparece 'saindo da janela – beber logo'.
CA-09 A rotina gera alertas de início, auge e saindo só para safras com estoque > 0, sem duplicar.
CA-10 Na aba Alertas, filtrar por tipo, marcar um como lido e marcar todos como lidos; o contador do Início acompanha.
CA-11 Avaliação pessoal 88, externa 4,2 (0–5, comunidade) e 92 (0–100, profissional): a ficha mostra pessoal 88, comunidade 84 e profissional 92, separados, preservando os valores originais.
CA-12 Cadastrar uma fonte e abrir o link a partir de uma avaliação externa; excluir a fonte mantém a avaliação; com zero fontes o app funciona.
CA-13 Exportar tudo baixa uma planilha com 6 abas e todos os registros da usuária.
CA-14 No celular, o menu vira gaveta e todas as telas cabem sem rolagem lateral; visual nas cores vinho/borgonha.
CA-15 Sem login não se vê nenhum dado; o botão Sair encerra a sessão.
CA-16 Foto nítida de um rótulo: o formulário abre com nome, produtor e safra sugeridos pelo Gemini; nada é gravado até a usuária salvar.
CA-17 Com a chave do Gemini inválida, leitura de rótulo e sommelier mostram aviso claro, e cadastro manual, adega, estoque e alertas continuam funcionando.
CA-18 Entrar como 'Adega da Mitra' mostra os 8 vinhos de exemplo; uma segunda usuária criada pela administradora entra com adega vazia e não vê nada da 'Adega da Mitra'.
CA-19 No chat, 'vou jantar risoto de cogumelos' com um Pinot Noir com estoque na adega: o sommelier indica essa garrafa com safra, quantidade e status, e o botão 'Abrir ficha' leva à ficha certa.
CA-20 Mandar a mesma pergunta por áudio: a transcrição aparece na conversa e a resposta é equivalente.
CA-21 Pedir harmonização para a qual não há garrafa na adega: o sommelier indica o tipo de vinho a comprar e não cita nenhuma garrafa como 'da sua adega'.
CA-22 O sommelier nunca indica safra com estoque 0 e não altera estoque sem a usuária tocar em 'Beber logo'. A chave do Gemini não aparece em tela nenhuma.

## 10. Pontos em aberto

Todos os pontos foram decididos:
- Avaliação pessoal de 0 a 100.
- IA: Google Gemini para leitura de rótulo, sommelier e transcrição do áudio (uma chave só; sem ChatGPT nem Claude).
- Sommelier virtual entra nesta versão, como chat com texto e áudio transcrito, consultando a adega da usuária.
- Janela por ano; 'saindo da janela' no último ano.
- Cada usuária tem adega separada; usuárias criadas pela administradora.
- Base de teste: usuária 'Adega da Mitra' com 8 vinhos de exemplo.
- Alerta por e-mail fora desta versão.
- Excluir fonte mantém as avaliações, sem fonte.

Para depois (fora desta versão): alerta por e-mail; adega compartilhada; importação da planilha do app antigo; segundo provedor de IA de reserva.

