#!/usr/bin/env bash

PYTHON_VERSION="3.13.3"
VENV_DIR=".venv"

find_python() {
    local major_minor="${PYTHON_VERSION%.*}"
    for cmd in "python${major_minor}" "python3" "python"; do
        if command -v "$cmd" &>/dev/null; then
            local ver
            ver=$("$cmd" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
            if [[ "$ver" == "$PYTHON_VERSION" ]]; then
                echo "$cmd"
                return 0
            fi
        fi
    done
    return 1
}

activate_pyenv() {
    if ! command -v pyenv &>/dev/null && [[ -f "$HOME/.pyenv/bin/pyenv" ]]; then
        export PYENV_ROOT="$HOME/.pyenv"
        export PATH="$PYENV_ROOT/bin:$PATH"
        eval "$(pyenv init -)"
    fi
}

PYTHON_CMD=""

if PYTHON_CMD=$(find_python); then
    echo "Python $PYTHON_VERSION encontrado: $PYTHON_CMD"
else
    activate_pyenv
    if command -v pyenv &>/dev/null; then
        echo "Python $PYTHON_VERSION nao encontrado. Instalando via pyenv..."
        pyenv install -s "$PYTHON_VERSION"
        pyenv local "$PYTHON_VERSION"
        PYTHON_CMD="python"
        echo "Python $PYTHON_VERSION instalado."
    else
        echo "Instale o pyenv ou a versao correspondente do python ($PYTHON_VERSION)"
        exit 1
    fi
fi

echo "Criando ambiente virtual em '$VENV_DIR'..."
if command -v pyenv &>/dev/null; then
    PYENV_VERSION="$PYTHON_VERSION" "$PYTHON_CMD" -m venv "$VENV_DIR"
else
    "$PYTHON_CMD" -m venv "$VENV_DIR"
fi

echo "Instalando dependencias..."
"$VENV_DIR/bin/pip" install --upgrade pip --quiet
"$VENV_DIR/bin/pip" install -r requirements.txt
"$VENV_DIR/bin/pip" install -e .

echo ""
echo "Pronto. Para ativar o ambiente:"
echo "$  VENV_DIR/bin/activate"
