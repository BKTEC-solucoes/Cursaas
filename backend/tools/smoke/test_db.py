# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

import sys

from sqlalchemy import inspect, text

from app.database import engine


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")

    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).scalar()
            inspector = inspect(engine)
            table_names = inspector.get_table_names()

        print("✅ Conexão com o banco de dados estabelecida com sucesso!")
        print(f"Resultado do teste SELECT 1: {result}")
        print(f"Total de tabelas: {len(table_names)}")
        print("Tabelas encontradas:")
        for table_name in table_names:
            print(f"- {table_name}")
    except Exception as error:
        print("❌ Falha ao conectar no banco de dados.")
        print(f"Erro detalhado: {error}")


if __name__ == "__main__":
    main()
