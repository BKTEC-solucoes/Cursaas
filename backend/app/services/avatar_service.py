"""
Serviço para gerar avatares SVG com as iniciais do nome.
"""

def gerar_avatar_iniciais(nome: str) -> str:
    """
    Gera um avatar SVG com as iniciais do nome.
    
    Args:
        nome: Nome da pessoa
        
    Returns:
        SVG em base64 ou como data URI
    """
    # Extrair iniciais (até 2 primeiras letras)
    palavras = nome.strip().split()
    if len(palavras) == 0:
        iniciais = "?"
    elif len(palavras) == 1:
        iniciais = palavras[0][0].upper()
    else:
        iniciais = (palavras[0][0] + palavras[1][0]).upper()
    
    # Cores pastel variadas em função do hash do nome
    cores = [
        "#FFB3BA",  # Rosa pastel
        "#FFCCCB",  # Vermelho pastel
        "#FFFFBA",  # Amarelo pastel
        "#BAFFC9",  # Verde pastel
        "#BAE1FF",  # Azul pastel
        "#D4B5FF",  # Roxo pastel
        "#FFE4B5",  # Laranja pastel
    ]
    
    cor_idx = sum(ord(c) for c in nome) % len(cores)
    cor_bg = cores[cor_idx]
    
    # SVG do avatar
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="{cor_bg}" rx="10"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="80"
        font-weight="bold"
        fill="#333333"
      >{iniciais}</text>
    </svg>
    """.strip()
    
    return svg
