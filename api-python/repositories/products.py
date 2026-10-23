from sqlalchemy import text

from database import engine

# La vista une cada producto con el nombre de su categoría y descarta los borrados.
CATALOG_QUERY = """
    SELECT id, titulo, descripcion, precio, categoria, imagen_url,
           calificacion_promedio, calificacion_cantidad
    FROM vista_catalogo_productos
"""


# Convierte una fila de la BD en el JSON con formato FakeStoreAPI que espera la app.
def _to_json(row):
    return {
        "id": row.id,
        "title": row.titulo,
        "price": float(row.precio),
        "description": row.descripcion or "",
        "category": row.categoria,
        "image": row.imagen_url or "",
        "rating": {"rate": float(row.calificacion_promedio), "count": row.calificacion_cantidad},
    }


def _find(conn, product_id):
    row = conn.execute(text(CATALOG_QUERY + " WHERE id = :id"), {"id": product_id}).first()
    return _to_json(row) if row else None


# Devuelve el id de la categoría y la crea si todavía no existe.
# Se compara con lower(): ignora mayúsculas pero no acentos.
def _get_or_create_category(conn, name):
    category_id = conn.execute(
        text("SELECT id FROM categorias WHERE lower(nombre) = lower(:nombre)"), {"nombre": name}
    ).scalar()
    if category_id is None:
        # Si otra petición acaba de crear la misma categoría, ON CONFLICT devuelve su id
        # en lugar de fallar por el índice único.
        category_id = conn.execute(
            text("""
                INSERT INTO categorias (nombre) VALUES (:nombre)
                ON CONFLICT ((lower(nombre))) DO UPDATE SET nombre = categorias.nombre
                RETURNING id
            """),
            {"nombre": name},
        ).scalar_one()
    return category_id


def _product_params(product, category_id):
    return {
        "titulo": product.title,
        "descripcion": product.description,
        "precio": product.price,
        "categoria_id": category_id,
        "imagen_url": product.image,
    }


def get_all():
    with engine.connect() as conn:
        rows = conn.execute(text(CATALOG_QUERY + " ORDER BY id"))
        return [_to_json(row) for row in rows]


def get_by_id(product_id):
    with engine.connect() as conn:
        return _find(conn, product_id)


def get_by_category(category_name):
    with engine.connect() as conn:
        rows = conn.execute(
            text(CATALOG_QUERY + " WHERE lower(categoria) = lower(:categoria) ORDER BY id"),
            {"categoria": category_name},
        )
        return [_to_json(row) for row in rows]


# Sólo lista categorías que tengan al menos un producto activo.
def get_categories():
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT DISTINCT categoria FROM vista_catalogo_productos ORDER BY categoria"))
        return [row.categoria for row in rows]


# engine.begin() abre una transacción: se confirma al salir del bloque o se revierte si hay error.
def create(product):
    with engine.begin() as conn:
        category_id = _get_or_create_category(conn, product.category)
        product_id = conn.execute(
            text("""
                INSERT INTO productos (titulo, descripcion, precio, categoria_id, imagen_url)
                VALUES (:titulo, :descripcion, :precio, :categoria_id, :imagen_url)
                RETURNING id
            """),
            _product_params(product, category_id),
        ).scalar_one()
        return _find(conn, product_id)


def update(product_id, product):
    with engine.begin() as conn:
        if _find(conn, product_id) is None:
            return None
        category_id = _get_or_create_category(conn, product.category)
        conn.execute(
            text("""
                UPDATE productos
                SET titulo = :titulo, descripcion = :descripcion, precio = :precio,
                    categoria_id = :categoria_id, imagen_url = :imagen_url
                WHERE id = :id
            """),
            {**_product_params(product, category_id), "id": product_id},
        )
        return _find(conn, product_id)


# Borrado lógico: el producto deja de verse en el catálogo, pero la fila se conserva
# porque carritos, órdenes y reseñas siguen apuntando a ella.
def delete(product_id):
    with engine.begin() as conn:
        product = _find(conn, product_id)
        if product is None:
            return None
        conn.execute(text("UPDATE productos SET activo = FALSE WHERE id = :id"), {"id": product_id})
        return product
