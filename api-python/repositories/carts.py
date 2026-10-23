from sqlalchemy import text

from database import engine

# Igual que en /users, los usuarios desactivados (activo = 0) no se muestran.
CARTS_QUERY = """
    SELECT c.id, c.usuario_id, c.fecha_creacion, i.producto_id, i.cantidad
    FROM carritos c
    JOIN usuarios u ON u.id = c.usuario_id AND u.activo
    LEFT JOIN carrito_items i ON i.carrito_id = c.id
"""


# Agrupa las filas (una por producto) en carritos con formato FakeStoreAPI.
def _group_carts(rows):
    carts = {}
    for row in rows:
        cart = carts.get(row.id)
        if cart is None:
            cart = {
                "id": row.id,
                "userId": row.usuario_id,
                "date": row.fecha_creacion.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                "products": [],
            }
            carts[row.id] = cart
        if row.producto_id is not None:
            cart["products"].append({"productId": row.producto_id, "quantity": row.cantidad})
    return list(carts.values())


def get_all():
    with engine.connect() as conn:
        rows = conn.execute(text(CARTS_QUERY + " ORDER BY c.id, i.id"))
        return _group_carts(rows)


def get_by_id(cart_id):
    with engine.connect() as conn:
        rows = conn.execute(text(CARTS_QUERY + " WHERE c.id = :id ORDER BY i.id"), {"id": cart_id})
        carts = _group_carts(rows)
        return carts[0] if carts else None
