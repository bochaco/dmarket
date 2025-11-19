docker network create dmarket

docker run --rm --name proof --network dmarket -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet' &

docker run --rm -p 8080:8080 --network dmarket -d dmarket
