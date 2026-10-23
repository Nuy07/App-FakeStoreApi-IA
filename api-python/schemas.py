from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field


# Reemplaza por "?" los caracteres que no se pueden guardar en UTF-8 (por ejemplo, un
# emoji cortado a la mitad) antes de validar el texto; si no, la API respondería 500.
def _valid_utf8(value):
    if isinstance(value, str):
        return value.encode("utf-8", "replace").decode("utf-8")
    return value


Text = Annotated[str, BeforeValidator(_valid_utf8)]


# Modelo para el login
class UserLogin(BaseModel):
    username: Text
    password: Text


# Los límites coinciden con las columnas de la tabla productos, para que un dato
# inválido se rechace con 422 antes de llegar a MySQL. Los espacios al inicio y al
# final se quitan, así " café frío " no crea una categoría nueva.
class ProductInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: Text = Field(min_length=1, max_length=200)
    price: float = Field(ge=0, le=99999999.99)          # DECIMAL(10,2) y CHECK precio >= 0
    description: Text = Field(max_length=10000)          # TEXT admite ~64 KB
    category: Text = Field(min_length=1, max_length=100)
    image: Text = Field(max_length=2048)


# Tamaños de las bebidas de la cafetería (chico, mediano y grande).
DrinkSize = Literal["S", "M", "L"]


# Un renglón del carrito: qué bebida, de qué tamaño y cuántas piezas.
class CartProduct(BaseModel):
    productId: int = Field(gt=0)
    quantity: int = Field(ge=1, le=999)
    size: DrinkSize = "S"


# Mismo formato que FakeStoreAPI: {"userId": 1, "date": "...", "products": [...]}.
class CartInput(BaseModel):
    userId: int | None = None
    date: Text | None = Field(default=None, max_length=40)
    products: list[CartProduct] = Field(max_length=100)
