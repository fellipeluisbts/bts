# BTS Browser

Navegador desktop experimental baseado em Chromium, construído com Electron.

## Executar

```bash
npm install
npm start
```

> Importante: o Electron abre uma janela do computador. Se este projeto estiver em um Codespace ou VS Code pelo navegador, ele nao conseguira mostrar a janela porque o container nao possui tela grafica. Baixe ou clone o projeto e abra-o no VS Code instalado no seu computador para executar `npm start`.

## Recursos da primeira versão

- Abas com abertura, troca e fechamento
- Navegação por URL ou pesquisa
- Voltar, avançar, recarregar e página inicial
- Favoritos persistidos durante a sessão
- Histórico em memória
- Downloads e DevTools do Chromium

O projeto usa APIs públicas do Chromium/Electron e uma identidade visual própria. Recursos exclusivos da distribuição Google Chrome, como sincronização de conta, não fazem parte desta base.
