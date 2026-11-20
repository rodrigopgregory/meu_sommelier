-- Dados das tabelas do app, lidos AGORA, em 2026-11-19 22:57:07 (horário de Brasília). Rodar depois de schema.sql.
-- Pais antes dos filhos; checagem de chave estrangeira LIGADA. Datas e horas são texto AAAA-MM-DDTHH:MM:SS (VARCHAR(19)), sem conversão. NULL continua NULL.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ADEGAS: 2 linha(s)
INSERT INTO `ADEGAS` (`USUARIO_ID`, `NOME`) VALUES
  (7, 'Adega da RPG'),
  (9, 'Minha adega');

-- CONFIG: 3 linha(s)
INSERT INTO `CONFIG` (`CHAVE`, `VALOR`) VALUES
  ('GEMINI_CONEXOES', 'gemini-sommelier,gemini,gemini-reserva-2,gemini-reserva-3,gemini-reserva-4,gemini-reserva-5,gemini-reserva-6'),
  ('IA_SEM_COTA', 'false'),
  ('MODELO_ANALISE', 'gemini-3.5-flash,gemini-flash-latest');

-- FONTES: 2 linha(s)
INSERT INTO `FONTES` (`ID`, `USUARIO_ID`, `NOME`, `CATEGORIA`, `URL`, `CONDICOES`) VALUES
  (3, 7, 'Vivino', 'COMUNIDADE', 'https://www.vivino.com', 'Registro manual; sem cópia automática de conteúdo.'),
  (4, 7, 'Wine Spectator', 'PROFISSIONAL', 'https://www.winespectator.com', 'Registro manual; sem cópia automática de conteúdo.');

-- PREFERENCIAS: 1 linha(s)
INSERT INTO `PREFERENCIAS` (`USUARIO_ID`, `TEMPERATURA`, `ESCALA_NOTA`, `PAIS`, `ATUALIZADO_EM`, `TIPOS_FAVORITOS`, `GOSTO_LIVRE`, `ALERTA_INICIO`, `ALERTA_AUGE`, `ALERTA_SAINDO`) VALUES
  (7, 'C', 100, 'Brasil', '2026-11-16T02:58:18', '', '', 1, 1, 1);

-- SOMMELIER_MENSAGENS: 24 linha(s)
INSERT INTO `SOMMELIER_MENSAGENS` (`ID`, `USUARIO_ID`, `PAPEL`, `TEXTO`, `SUGESTOES`, `VIA_AUDIO`, `CRIADO_EM`) VALUES
  (1, 7, 'usuario', 'Vou jantar risoto de cogumelos', NULL, 0, '2026-11-15T16:11:21'),
  (2, 7, 'sommelier', 'Para acompanhar um delicioso risoto de cogumelos, o ideal são vinhos que complementem o tom terroso do prato sem se sobrepor. Um Pinot Noir estruturado ou um bom Nebbiolo envelhecido harmonizam perfeitamente com a intensidade e a cremosidade dos cogumelos.', '{"sugestoes":[{"safraId":1,"vinhoId":1,"nome":"Pinot Noir Reserva","produtor":"Domaine Laroche","ano":2019,"estoque":3,"status":"AUGE","porQue":"Este Pinot Noir está no auge e seus aromas terrosos casam perfeitamente com o risoto de cogumelos."},{"safraId":4,"vinhoId":3,"nome":"Barolo Classico","produtor":"Pio Cesare","ano":2012,"estoque":2,"status":"SAINDO","porQue":"Um Nebbiolo com boa evolução que traz notas complexas de trufas e cogumelos, ideal para consumir logo."}],"comprar":""}', 0, '2026-11-15T16:11:21'),
  (3, 7, 'usuario', 'Vou comer sushi de salmão com shoyu', NULL, 0, '2026-11-15T16:11:31'),
  (4, 7, 'sommelier', 'Para harmonizar com sushi de salmão e molho shoyu, precisamos de vinhos com boa acidez e frescor para cortar a gordura do peixe, sem serem massacrados pelo sal do shoyu. Espumantes brut e brancos minerais ou bem leves são excelentes escolhas.', '{"sugestoes":[{"safraId":7,"vinhoId":6,"nome":"Champagne Brut","produtor":"Veuve Clicquot","ano":2018,"estoque":2,"status":"AUGE_FIM","porQue":"A acidez do Champagne limpa a gordura do salmão e as bolhas equilibram a intensidade do shoyu."},{"safraId":5,"vinhoId":4,"nome":"Chablis Premier Cru","produtor":"William Fèvre","ano":2020,"estoque":3,"status":"JANELA","porQue":"Este Chablis traz um perfil mineral e seco ideal para valorizar o peixe cru."},{"safraId":8,"vinhoId":7,"nome":"Sauvignon Blanc","produtor":"Casa Valduga","ano":2024,"estoque":4,"status":"SEM_JANELA","porQue":"Um branco bem fresco e jovem que acompanha super bem a leveza do sushi."}],"comprar":""}', 0, '2026-11-15T16:11:31'),
  (5, 7, 'usuario', 'Qual a capital da França?', NULL, 0, '2026-11-15T16:11:39'),
  (6, 7, 'sommelier', 'Eu só ajudo com a sua adega e com harmonização de vinhos e comida. Me conte o que você vai comer ou a ocasião.', '{"sugestoes":[],"comprar":""}', 0, '2026-11-15T16:11:39'),
  (7, 7, 'usuario', 'Vou jantar risoto de cogumelos', NULL, 0, '2026-11-15T16:13:21'),
  (8, 7, 'sommelier', 'Para acompanhar um delicioso risoto de cogumelos, o ideal são vinhos que complementem os sabores terrosos e a cremosidade do prato. Tintos de médio corpo e com boa complexidade aromática, como o Pinot Noir e o Nebbiolo, são escolhas perfeitas.', '{"sugestoes":[{"safraId":1,"vinhoId":1,"nome":"Pinot Noir Reserva","produtor":"Domaine Laroche","ano":2019,"estoque":3,"status":"AUGE","porQue":"Este Pinot Noir está no auge e traz notas terrosas que combinam perfeitamente com os cogumelos."},{"safraId":4,"vinhoId":3,"nome":"Barolo Classico","produtor":"Pio Cesare","ano":2012,"estoque":2,"status":"SAINDO","porQue":"Este Barolo à base de Nebbiolo está saindo da janela e possui a maturidade ideal para harmonizar com a intensidade do risoto."}],"comprar":""}', 0, '2026-11-15T16:13:21'),
  (9, 7, 'usuario', 'Vou comer sushi de salmão com shoyu', NULL, 0, '2026-11-15T16:13:22'),
  (10, 7, 'sommelier', 'Para harmonizar com sushi de salmão e molho shoyu, precisamos de vinhos com boa acidez e frescor para equilibrar a gordura do peixe e a salinidade do molho. Espumantes Brut e brancos de alta acidez são opções perfeitas para essa combinação.', '{"sugestoes":[{"safraId":7,"vinhoId":6,"nome":"Champagne Brut","produtor":"Veuve Clicquot","ano":2018,"estoque":2,"status":"AUGE_FIM","porQue":"Este espumante no auge traz acidez vibrante e borbulhas que limpam o paladar a cada bocado de sushi."},{"safraId":5,"vinhoId":4,"nome":"Chablis Premier Cru","produtor":"William Fèvre","ano":2020,"estoque":3,"status":"JANELA","porQue":"Um branco mineral e fresco que corta a gordura do salmão sem se sobrepor aos sabores delicados do peixe."}],"comprar":""}', 0, '2026-11-15T16:13:22'),
  (11, 7, 'usuario', 'Qual a capital da França?', NULL, 0, '2026-11-15T16:13:24'),
  (12, 7, 'sommelier', 'Eu só ajudo com a sua adega e com harmonização de vinhos e comida. Me conte o que você vai comer ou a ocasião.', '{"sugestoes":[],"comprar":""}', 0, '2026-11-15T16:13:24'),
  (13, 7, 'usuario', 'Vou jantar risoto de cogumelos hoje. Qual vinho eu abro?', NULL, 1, '2026-11-15T16:13:31'),
  (14, 7, 'sommelier', 'Para acompanhar um delicioso risoto de cogumelos, vinhos com notas terrosas e boa acidez são fantásticos. Opções de médio corpo a encorpados, como Pinot Noir e Nebbiolo, vão harmonizar perfeitamente com a estrutura do prato.', '{"sugestoes":[{"safraId":1,"vinhoId":1,"nome":"Pinot Noir Reserva","produtor":"Domaine Laroche","ano":2019,"estoque":3,"status":"AUGE","porQue":"Este Pinot Noir está no auge e traz notas terrosas que combinam perfeitamente com os cogumelos."},{"safraId":4,"vinhoId":3,"nome":"Barolo Classico","produtor":"Pio Cesare","ano":2012,"estoque":2,"status":"SAINDO","porQue":"Um Nebbiolo encorpado e complexo, ideal para risotos e que precisa ser bebido logo."}],"comprar":""}', 0, '2026-11-15T16:13:31'),
  (15, 7, 'usuario', 'Vou jantar risoto de cogumelos', NULL, 0, '2026-11-15T16:31:57'),
  (16, 7, 'sommelier', 'Para harmonizar com um delicioso risoto de cogumelos, vinhos tintos mais elegantes, de médio corpo e com notas terrosas são a escolha ideal. Eles complementam perfeitamente o sabor umami e a textura cremosa do prato.', '{"sugestoes":[{"safraId":1,"vinhoId":1,"nome":"Pinot Noir Reserva","produtor":"Domaine Laroche","ano":2019,"estoque":3,"status":"AUGE","porQue":"Este Pinot Noir está no auge e suas notas terrosas combinam perfeitamente com cogumelos."},{"safraId":4,"vinhoId":3,"nome":"Barolo Classico","produtor":"Pio Cesare","ano":2012,"estoque":2,"status":"SAINDO","porQue":"Este Barolo de Nebbiolo tem excelente estrutura para o risoto e precisa ser bebido logo."}],"comprar":""}', 0, '2026-11-15T16:31:57'),
  (17, 7, 'usuario', 'Vou comer sushi de salmão com shoyu', NULL, 0, '2026-11-15T16:31:59'),
  (18, 7, 'sommelier', 'Para acompanhar sushi de salmão com shoyu, o ideal é um vinho com boa acidez e frescor para cortar a gordura do peixe, sem se sobrepor ao sabor do prato. Espumantes ou brancos mais leves e cítricos são excelentes escolhas.', '{"sugestoes":[{"safraId":7,"vinhoId":6,"nome":"Champagne Brut","produtor":"Veuve Clicquot","ano":2018,"estoque":2,"status":"AUGE_FIM","porQue":"Este Champagne no auge traz acidez vibrante e borbulhas que limpam o paladar e equilibram o salmão com shoyu."},{"safraId":5,"vinhoId":4,"nome":"Chablis Premier Cru","produtor":"William Fèvre","ano":2020,"estoque":3,"status":"JANELA","porQue":"Um Chablis mineral e fresco que harmoniza muito bem com a gordura do salmão sem anular o prato."},{"safraId":8,"vinhoId":7,"nome":"Sauvignon Blanc","produtor":"Casa Valduga","ano":2024,"estoque":4,"status":"SEM_JANELA","porQue":"Um branco bem jovem e cítrico que traz a leveza ideal para combinar com sushi."}],"comprar":""}', 0, '2026-11-15T16:31:59'),
  (19, 7, 'usuario', 'Qual a capital da França?', NULL, 0, '2026-11-15T16:32:01'),
  (20, 7, 'sommelier', 'Eu só ajudo com a sua adega e com harmonização de vinhos e comida. Me conte o que você vai comer ou a ocasião.', '{"sugestoes":[],"comprar":""}', 0, '2026-11-15T16:32:01'),
  (21, 7, 'usuario', 'Vou jantar risoto de cogumelos hoje. Qual vinho eu abro?', NULL, 1, '2026-11-15T16:33:37'),
  (22, 7, 'sommelier', 'Para harmonizar com um delicioso risoto de cogumelos, a melhor escolha são vinhos tintos de médio corpo, boa acidez e notas terrosas, que combinam perfeitamente com o perfil umami dos cogumelos.', '{"sugestoes":[{"safraId":1,"vinhoId":1,"nome":"Pinot Noir Reserva","produtor":"Domaine Laroche","ano":2019,"estoque":3,"status":"AUGE","porQue":"Este Pinot Noir está no auge, trazendo leveza, acidez e notas terrosas perfeitas para os cogumelos."},{"safraId":4,"vinhoId":3,"nome":"Barolo Classico","produtor":"Pio Cesare","ano":2012,"estoque":2,"status":"SAINDO","porQue":"O Nebbiolo possui excelente acidez e complexidade terrosa, estando ideal para consumo imediato."}],"comprar":""}', 0, '2026-11-15T16:33:37'),
  (23, 7, 'usuario', 'Me fala sobre o Barolo Classico 2012 da Pio Cesare. Quando abrir?', NULL, 0, '2026-11-16T02:58:25'),
  (24, 7, 'sommelier', 'O Barolo Classico 2012 da Pio Cesare é um tinto potente e elegante do Piemonte, com notas marcantes de frutas vermelhas maduras, couro e especiarias. Ele está saindo da sua janela ideal de consumo, então o momento perfeito para abri-lo é agora! Sirva entre 16°C e 18°C e decante por cerca de uma hora antes de beber.', '{"sugestoes":[{"safraId":4,"vinhoId":3,"nome":"Barolo Classico","produtor":"Pio Cesare","ano":2012,"estoque":2,"status":"SAINDO","porQue":"Está saindo da janela de consumo e deve ser apreciado o quanto antes."}],"comprar":""}', 0, '2026-11-16T02:58:25');

-- TIPOS_VINHO: 7 linha(s)
INSERT INTO `TIPOS_VINHO` (`ID`, `NOME`) VALUES
  (1, 'Tinto'),
  (2, 'Branco'),
  (3, 'Rosé'),
  (4, 'Espumante'),
  (5, 'Fortificado'),
  (6, 'Sobremesa'),
  (7, 'Laranja');

-- VINHOS: 10 linha(s)
INSERT INTO `VINHOS` (`ID`, `USUARIO_ID`, `NOME`, `PRODUTOR`, `PAIS`, `REGIAO`, `UVA`, `TIPO_ID`, `FOTO_KEY`, `NOTAS`, `CRIADO_EM`) VALUES
  (1, 7, 'Pinot Noir Reserva', 'Domaine Laroche', 'França', 'Borgonha', 'Pinot Noir', 1, NULL, 'Comprado na viagem a Beaune.', '2026-11-15T16:10:00'),
  (2, 7, 'Malbec Gran Reserva', 'Bodega Catena', 'Argentina', 'Mendoza', 'Malbec', 1, NULL, NULL, '2026-11-15T16:10:00'),
  (3, 7, 'Barolo Classico', 'Pio Cesare', 'Itália', 'Piemonte', 'Nebbiolo', 1, NULL, 'Guardar para ocasião especial.', '2026-11-15T16:10:00'),
  (4, 7, 'Chablis Premier Cru', 'William Fèvre', 'França', 'Borgonha', 'Chardonnay', 2, NULL, NULL, '2026-11-15T16:10:00'),
  (5, 7, 'Rioja Gran Reserva', 'La Rioja Alta', 'Espanha', 'Rioja', 'Tempranillo', 1, NULL, NULL, '2026-11-15T16:10:00'),
  (6, 7, 'Champagne Brut', 'Veuve Clicquot', 'França', 'Champagne', 'Pinot Noir, Chardonnay', 4, NULL, 'Para o réveillon.', '2026-11-15T16:10:00'),
  (7, 7, 'Sauvignon Blanc', 'Casa Valduga', 'Brasil', 'Serra Gaúcha', 'Sauvignon Blanc', 2, NULL, NULL, '2026-11-15T16:10:00'),
  (8, 7, 'Porto Tawny 20 anos', 'Taylor''s', 'Portugal', 'Douro', 'Touriga Nacional', 5, NULL, NULL, '2026-11-15T16:10:00'),
  (14, 9, 'Casillero del Diablo Carmenère', 'Concha y Toro', 'Chile', 'Vale Central', 'Carmenère', 1, NULL, NULL, '2026-11-16T05:40:12'),
  (15, 9, 'Balduzzi Grand Reserve Carignan Viejo Encachao', 'Balduzzi', 'Chile', 'Valle del Maule', 'Carignan', 1, 'ai-files/private/17s6w5ld9zhuai7zbfupcy3e/rotulo.jpg', NULL, '2026-11-16T13:45:41');

-- SAFRAS: 11 linha(s)
INSERT INTO `SAFRAS` (`ID`, `VINHO_ID`, `ANO`, `JANELA_INICIO`, `JANELA_AUGE`, `JANELA_FIM`, `CRIADO_EM`) VALUES
  (1, 1, 2019, 2023, 2026, 2030, '2026-11-15T16:10:00'),
  (2, 2, 2019, 2024, 2027, 2032, '2026-11-15T16:10:00'),
  (3, 2, 2021, 2027, 2030, 2036, '2026-11-15T16:10:00'),
  (4, 3, 2012, 2020, 2024, 2026, '2026-11-15T16:10:00'),
  (5, 4, 2020, 2024, 2025, 2028, '2026-11-15T16:10:00'),
  (6, 5, 2010, 2016, 2020, 2025, '2026-11-15T16:10:00'),
  (7, 6, 2018, 2024, 2026, 2026, '2026-11-15T16:10:00'),
  (8, 7, 2024, NULL, NULL, NULL, '2026-11-15T16:10:00'),
  (9, 8, 2022, 2028, 2036, 2056, '2026-11-15T16:10:00'),
  (23, 14, 2024, 2025, 2026, 2028, '2026-11-16T05:40:12'),
  (24, 15, 2020, 2024, 2027, 2032, '2026-11-16T13:45:41');

-- ALERTAS: 7 linha(s)
INSERT INTO `ALERTAS` (`ID`, `SAFRA_ID`, `TIPO`, `ANO_REF`, `LIDO`, `ARQUIVADO`, `CRIADO_EM`) VALUES
  (1, 2, 'INICIO', 2024, 0, 0, '2026-11-15T16:10:00'),
  (2, 1, 'AUGE', 2026, 0, 0, '2026-11-15T16:10:00'),
  (3, 7, 'AUGE', 2026, 0, 0, '2026-11-15T16:10:00'),
  (4, 4, 'SAINDO', 2026, 0, 0, '2026-11-15T16:10:00'),
  (5, 7, 'SAINDO', 2026, 0, 0, '2026-11-15T16:10:00'),
  (74, 23, 'AUGE', 2026, 0, 0, '2026-11-16T05:51:01'),
  (143, 24, 'INICIO', 2024, 0, 0, '2026-11-16T13:46:11');

-- AVALIACOES_EXTERNAS: 5 linha(s)
INSERT INTO `AVALIACOES_EXTERNAS` (`ID`, `SAFRA_ID`, `FONTE_ID`, `FONTE_NOME`, `FONTE_URL`, `AVALIADOR`, `NOTA`, `ESCALA_MAX`, `TIPO`, `DATA`, `URL`) VALUES
  (1, 1, 4, 'Wine Spectator', 'https://www.winespectator.com', NULL, 92, 100, 'PROFISSIONAL', '2026-03-01', 'https://www.winespectator.com'),
  (2, 1, 3, 'Vivino', 'https://www.vivino.com', NULL, 4.2, 5, 'COMUNIDADE', '2026-03-01', 'https://www.vivino.com'),
  (3, 2, NULL, 'Descorchados', NULL, NULL, 91, 100, 'PROFISSIONAL', '2026-03-01', NULL),
  (4, 4, NULL, 'James Suckling', NULL, NULL, 94, 100, 'PROFISSIONAL', '2026-03-01', NULL),
  (5, 9, 3, 'Vivino', 'https://www.vivino.com', NULL, 4.6, 5, 'COMUNIDADE', '2026-03-01', 'https://www.vivino.com');

-- AVALIACOES_PESSOAIS: 3 linha(s)
INSERT INTO `AVALIACOES_PESSOAIS` (`ID`, `SAFRA_ID`, `NOTA`, `COMENTARIO`, `DATA`) VALUES
  (1, 1, 90, 'Frutas vermelhas, taninos sedosos.', '2026-03-01'),
  (2, 2, 88, 'Encorpado, ameixa e baunilha.', '2026-03-01'),
  (3, 5, 86, 'Mineral, cítrico.', '2026-03-01');

-- MOVIMENTACOES: 21 linha(s)
INSERT INTO `MOVIMENTACOES` (`ID`, `SAFRA_ID`, `TIPO`, `QUANTIDADE`, `MOTIVO`, `DATA`, `CRIADO_EM`) VALUES
  (1, 1, 'E', 4, 'compra', '2025-06-10', '2026-11-15T16:10:00'),
  (2, 1, 'S', 1, 'jantar', '2026-02-14', '2026-11-15T16:10:00'),
  (3, 2, 'E', 4, 'compra', '2024-03-10', '2026-11-15T16:10:00'),
  (4, 3, 'E', 2, 'presente', '2025-12-25', '2026-11-15T16:10:00'),
  (5, 4, 'E', 2, 'compra', '2021-08-01', '2026-11-15T16:10:00'),
  (6, 5, 'E', 3, 'compra', '2025-09-05', '2026-11-15T16:10:00'),
  (7, 6, 'E', 1, 'compra', '2020-04-20', '2026-11-15T16:10:00'),
  (8, 7, 'E', 2, 'presente', '2026-01-05', '2026-11-15T16:10:00'),
  (9, 8, 'E', 6, 'compra', '2026-03-01', '2026-11-15T16:10:00'),
  (10, 8, 'S', 2, 'jantar', '2026-04-12', '2026-11-15T16:10:00'),
  (11, 9, 'E', 1, 'compra', '2026-05-18', '2026-11-15T16:10:00'),
  (33, 4, 'E', 1, 'ajuste', '2026-11-16', '2026-11-16T03:03:34'),
  (34, 4, 'S', 1, 'ajuste', '2026-11-16', '2026-11-16T03:03:36'),
  (35, 23, 'E', 1, 'compra', '2026-11-16', '2026-11-16T05:40:12'),
  (36, 23, 'E', 1, 'compra', '2026-11-16', '2026-11-16T05:49:42'),
  (37, 23, 'S', 1, 'ajuste', '2026-11-16', '2026-11-16T05:49:45'),
  (38, 23, 'S', 1, 'ajuste', '2026-11-16', '2026-11-16T05:49:46'),
  (39, 23, 'E', 1, 'ajuste', '2026-11-16', '2026-11-16T05:49:48'),
  (40, 24, 'E', 1, 'compra', '2026-11-16', '2026-11-16T13:45:41'),
  (41, 24, 'E', 1, 'ajuste', '2026-11-16', '2026-11-16T13:46:20'),
  (42, 24, 'S', 1, 'ajuste', '2026-11-16', '2026-11-16T13:46:21');

-- SAFRA_SERVICO: 3 linha(s)
INSERT INTO `SAFRA_SERVICO` (`SAFRA_ID`, `TEMPERATURA`, `DECANTACAO`, `ABERTURA`, `TACA`, `DEPOIS_ABERTO`, `ORIGEM`, `ATUALIZADO_EM`) VALUES
  (4, 'Sirva entre 16°C e 18°C. Retire da adega climatizada cerca de 30 minutos antes de servir ou coloque na geladeira por 15 a 20 minutos se estiver em temperatura ambiente.', 'Decante cuidadosamente por 30 a 45 minutos antes de servir. Por ser um vinho maduro de 2012, evite aerações muito longas para não perder os aromas delicados.', 'Mantenha a garrafa em pé por 24 horas antes para assentar os sedimentos. Use um saca-rolhas de lâminas (Ah-So) ou de sommelier com muito cuidado, pois a rolha pode estar frágil. Sirva devagar contra a luz para deixar a borra na garrafa.', 'Utilize a taça estilo Bourgogne ou específica para Nebbiolo/Barolo. Seu formato com bojo largo e boca afunilada ajuda a concentrar os aromas complexos e suavizar os taninos.', 'Conserve na própria garrafa refritada com tampa a vácuo na geladeira por até 2 dias. Por estar no auge de sua maturidade, o vinho perderá o frescor rapidamente após aberto.', 'IA', '2026-11-16T02:15:28'),
  (5, 'Sirva entre 10°C e 12°C. Retire da adega climatizada cerca de 15 a 20 minutos antes de servir ou coloque na geladeira por 1 hora se estiver em temperatura ambiente.', 'Não é necessário decantar. Deixe a garrafa aberta por 15 a 30 minutos antes de servir para que o vinho respire e revele seus aromas minerais.', 'Utilize um saca-rolhas de sommelier convencional com espiral longa. Remova a rolha com cuidado constante para evitar que se quebre, embora a safra recente ofereça boa elasticidade.', 'Utilize uma taça de tamanho médio no modelo Borgonha ou a clássica taça de vinho branco. O formato valoriza os aromas florais, a acidez viva e a mineralidade do Chardonnay.', 'Conserve a garrafa tampada na geladeira por até 3 a 4 dias. O uso de uma bomba a vácuo ajuda a preservar o frescor e o perfil aromático por mais tempo.', 'MANUAL', '2026-11-16T02:19:50'),
  (23, 'Sirva entre 16°C e 18°C. Coloque a garrafa na geladeira por cerca de 20 minutos antes de servir ou retire da adega climatizada 10 minutos antes.', 'Não exige decantação prolongada por ser um tinto jovem. Deixar a garrafa aberta por 15 a 30 minutos antes de servir já é suficiente para aerar.', 'Utilize um saca-rolhas tradicional de dois estágios com calma. Como o vinho é jovem, a rolha estará firme e não haverá presença de borras no fundo.', 'Utilize uma taça de tamanho médio do tipo Bordeaux. Este formato ajuda a concentrar os aromas frutados e herbáceos típicos da Carmenère.', 'Dura de 3 a 4 dias após aberto. Guarde a garrafa re-corchada na geladeira em posição vertical para desacelerar a oxidação.', 'IA', '2026-11-16T05:41:34');
