# 🎵 Somax.Catálogo - Gestão de Master Tapes (Polymusic)

O **Somax.Catálogo** é um sistema de gestão de arquivo técnico e inventário musical desenvolvido para o controle rigoroso de Master Tapes, Vinis e CDs. O sistema integra hardware de captura (câmera móvel), geração de etiquetas físicas e um banco de dados relacional em tempo real.

⚠️ **AVISO:** Este software é de uso exclusivo da **Polymusic**. Todos os direitos reservados.

---

## 🚀 Funcionalidades Principais

### 1. Scanner Móvel & Mini-CMS
- **Leitura de Barras:** Interface otimizada para câmeras de smartphones que identifica códigos `CODE128` nas lombadas das fitas.
- **Ficha Técnica Digital:** Edição em tempo real de informações como Intérprete, Gênero, Compositores, Músicos e Tracklist completa.
- **Sincronização Direta:** Atualização instantânea no banco de dados sem necessidade de recarregar a página.

### 2. Gerador de Etiquetas Profissionais
- **Padrão 9mm:** Layout configurado especificamente para fitas de rotuladores (Dymo/Brother).
- **Identificação Visual:** Impressão combinada de Código de Barras + Título do Álbum + Nº do Tape.
- **Filtro por Prateleira:** Permite a geração de lotes de etiquetas por localização física (ex: Prateleira 3K).

### 3. Impressão de Fichas Técnicas (Layout Studio)
- Geração de documentos PDF/Impressão com estética clássica de grandes estúdios (Polymusic Layout).
- Ideal para documentação física de arquivo e anexos de caixas de Master Tapes.

### 4. Dashboard & Inventário
- Controle de status de distribuição (Stream Status, Taken Down).
- Exportação de relatórios completos em **PDF** e **CSV** (Excel).
- Busca inteligente com suporte a acentuação e termos fonéticos.

---

## 🛠️ Stack Tecnológica

- **Frontend:** HTML5, CSS3 (Tailwind CSS), JavaScript (ES6+).
- **Backend (BaaS):** [Supabase](https://supabase.com/) (PostgreSQL + Auth).
- **Bibliotecas Principais:**
  - `html5-qrcode`: Processamento de imagem e decodificação de barras.
  - `JsBarcode`: Geração de vetores para códigos de barras.
  - `jsPDF` & `AutoTable`: Geração de relatórios complexos.

---

## ⚙️ Configuração e Instalação

1. Clone este repositório:
   ```bash
   git clone [https://github.com/seu-usuario/somax-catalogo.git](https://github.com/seu-usuario/somax-catalogo.git)
