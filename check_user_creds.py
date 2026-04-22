from sqlalchemy import create_engine, text
e = create_engine("mysql+pymysql://root:gahesil@localhost:3306/cursaas")
with e.connect() as conn:
    r = conn.execute(text(
        "SELECT id, email, role, admin_role, faculdade_id FROM usuarios "
        "WHERE faculdade_id IS NOT NULL LIMIT 5"
    ))
    for row in r:
        print(dict(row._mapping))
