# BTS Browser

Navegador desktop experimental baseado em Chromium, construído com Electron.

## Executar

```bash
npm install
npm start
```

No Windows, tambem e possivel clicar duas vezes no arquivo `abrir-navegador.bat`. Ele instala as dependencias na primeira execucao e abre o navegador automaticamente.

> Importante: o Electron abre uma janela do computador. Se este projeto estiver em um Codespace ou VS Code pelo navegador, ele nao conseguira mostrar a janela porque o container nao possui tela grafica. Baixe ou clone o projeto e abra-o no VS Code instalado no seu computador para executar `npm start`.

## Recursos da primeira versão

- Abas com abertura, troca e fechamento
- Navegação por URL ou pesquisa
- Voltar, avançar, recarregar e página inicial
- Favoritos persistidos durante a sessão
- Histórico em memória
- Downloads e DevTools do Chromium
- Barra única com mosaico de até seis abas selecionadas por checkbox
- Painel lateral, favoritos em painel e menu de perfil/extensões/privacidade

Atalhos principais: `Ctrl+T` nova aba, `Ctrl+W` fechar aba, `Ctrl+Shift+T` reabrir aba, `Ctrl+L` endereço, `Ctrl+D` favorito, `Ctrl+Tab` alternar abas, `Ctrl+1` a `Ctrl+9` selecionar aba, `Ctrl+Shift+I` ou `F12` DevTools e `Ctrl+Shift+B` favoritos.

O projeto usa APIs públicas do Chromium/Electron e uma identidade visual própria. Recursos exclusivos da distribuição Google Chrome, como sincronização de conta, não fazem parte desta base.
O item Perfil abre a autenticação Google no navegador; sincronização completa de conta Google e instalação automática da Chrome Web Store exigem integrações proprietárias que não são fornecidas pelo Electron.
