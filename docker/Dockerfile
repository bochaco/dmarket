# Usamos uma imagem base leve com bash
FROM ubuntu:24.04
SHELL ["/bin/bash", "-lc"]

# Instala dependências necessárias
RUN apt-get update && apt-get install -y curl ca-certificates bash git unzip xz-utils tar

RUN apt update
RUN apt upgrade -y

# Install Node
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 
RUN apt install -y nodejs

RUN npm install -g corepack

RUN cd

# Compact
RUN curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh -o compact-installer.sh
RUN chmod +x compact-installer.sh
RUN ./compact-installer.sh

# RUN source $HOME/.local/bin/env
RUN /root/.local/bin/compact check
RUN /root/.local/bin/compact update

RUN npm -v
# Project
RUN git clone https://github.com/bochaco/dmarket.git

# Install Project
WORKDIR /dmarket
RUN npm install
WORKDIR /dmarket/contract
RUN npm install
RUN npm run compact
WORKDIR /dmarket/gui
RUN npm install

# RUN A SERVER
CMD ["npm", "run", "build:start"]