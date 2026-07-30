# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""Testa o endpoint PUT /api/faculdades/minha/tema diretamente."""
import urllib.request
import urllib.error
import json
import sys

class _Session:
    """Helper simples para requests com urllib."""
    def post(self, url, json_data=None, headers=None, timeout=5):
        data = json.dumps(json_data).encode() if json_data else None
        req = urllib.request.Request(url, data=data, headers=headers or {}, method='POST')
        req.add_header('Content-Type', 'application/json')
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return type('R', (), {'status_code': r.status, 'json': lambda: json.loads(r.read())})()
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            return type('R', (), {'status_code': e.code, 'json': lambda b=body: json.loads(b), 'text': body})()

    def put(self, url, json_data=None, headers=None, timeout=10):
        data = json.dumps(json_data).encode() if json_data else None
        req = urllib.request.Request(url, data=data, headers=headers or {}, method='PUT')
        req.add_header('Content-Type', 'application/json')
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return type('R', (), {'status_code': r.status, 'json': lambda: json.loads(r.read())})()
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            return type('R', (), {'status_code': e.code, 'json': lambda b=body: json.loads(b), 'text': body})()

requests = _Session()

BASE = "http://localhost:8000/api"

# Primeiro, fazer login
credentials_to_try = [
    {"email": "admin@faculdade.com", "senha": "admin123"},
    {"email": "instituicao@teste.com", "senha": "teste123"},
    {"email": "admin@teste.com", "senha": "admin123"},
]

# Busca usuários do DB com faculdade_id
try:
    from sqlalchemy import create_engine, text
    e = create_engine("mysql+pymysql://root:gahesil@localhost:3306/cursaas")
    with e.connect() as conn:
        # Busca usuários com faculdade_id que têm role admin/instituicao
        r = conn.execute(text(
            "SELECT email, role, faculdade_id FROM usuarios "
            "WHERE faculdade_id IS NOT NULL "
            "AND role IN ('admin','instituicao') LIMIT 5"
        ))
        db_users = [dict(row._mapping) for row in r]
        print("Usuarios com faculdade:", db_users)
except Exception as ex:
    print(f"Erro ao buscar usuarios: {ex}")
    db_users = []

# Tenta login com os usuarios encontrados
token = None
for user in db_users:
    email = user["email"]
    for senha in ["admin123", "teste123", "123456", "senha123", "password"]:
        try:
            resp = requests.post(f"{BASE}/auth/login", json={"email": email, "senha": senha}, timeout=5)
            if resp.status_code == 200:
                token = resp.json().get("access_token")
                print(f"Login OK: {email} com senha: {senha}")
                break
        except:
            pass
    if token:
        break

if not token:
    print("Nao foi possivel fazer login. Testando sem autenticacao...")
    # Testa o endpoint para ver o status
    payload = {
        "primary_color": "#1a6b3c",
        "secondary_color": "#0f4b2a",
        "background_color": "#f0fdf4",
        "font_family": "Inter, system-ui, sans-serif",
        "dark_mode": False,
        "dark_primary_color": "#34d399",
        "dark_secondary_color": "#10b981",
        "dark_background_color": "#0f172a",
        "border_radius": "8px",
        "layout_type": "topbar",
        "gradient_enabled": False,
        "shadow_level": "soft",
        "spacing": "comfortable",
        "page_overrides": None
    }
    resp = requests.put(f"{BASE}/faculdades/minha/tema", json=payload, timeout=5)
    print(f"Status sem token: {resp.status_code}")
    print("Resposta:", json.dumps(resp.json(), indent=2, ensure_ascii=False))
    sys.exit(0)

# Testa o PUT com token
headers = {"Authorization": f"Bearer {token}"}
payload = {
    "primary_color": "#1a6b3c",
    "secondary_color": "#0f4b2a",
    "background_color": "#f0fdf4",
    "font_family": "Inter, system-ui, sans-serif",
    "dark_mode": False,
    "dark_primary_color": "#34d399",
    "dark_secondary_color": "#10b981",
    "dark_background_color": "#0f172a",
    "border_radius": "8px",
    "layout_type": "topbar",
    "gradient_enabled": False,
    "shadow_level": "soft",
    "spacing": "comfortable",
    "page_overrides": None
}

print(f"\nTestando PUT /api/faculdades/minha/tema...")
resp = requests.put(f"{BASE}/faculdades/minha/tema", json=payload, headers=headers, timeout=10)
print(f"Status: {resp.status_code}")
try:
    print("Resposta:", json.dumps(resp.json(), indent=2, ensure_ascii=False))
except:
    print("Resposta (raw):", resp.text[:500])
