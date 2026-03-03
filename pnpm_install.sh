export http_proxy="http://134.79.44.164:3128"
export https_proxy="http://134.79.44.164:3128"
export HTTP_PROXY="$http_proxy"
export HTTPS_PROXY="$https_proxy"

mkdir -p ~/.npm-global
npm config --location user set prefix "$HOME/.npm-global"

export PATH="$HOME/.npm-global/bin:$PATH"
