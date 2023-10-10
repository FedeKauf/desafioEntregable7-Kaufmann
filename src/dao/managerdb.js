import mongoose from "mongoose";
import { cartModel } from "./models/entities.model.js";
import { productModel } from "./models/entities.model.js";
import { Router } from "express";
const router = Router();

console.log("conectando!");
mongoose
  .connect(
    "mongodb+srv://kaufmannEcommerce:kaufmannEcommerce@kaufmanndb.wakqh7a.mongodb.net/?retryWrites=true&w=majority&dbName=KaufmannDB"
  )
  .then((event) => console.log("conecto!"))
  .catch((error) => console.log(error));

const getPage = (value) => {
  if (!value || value.trim() === "") return 1;
  const page = parseInt(value);
  if (page < 1) return 1;

  return page;
};

router.get("/carts/:cid", async (req, res) => {
  try {
    const cartId = req.params.cid;
    const cart = await cartModel.findOne({ cartId }).exec();
    if (cart) {
      res.json(cart);
    } else {
      res.status(404).send("Carrito no encontrado");
    }
  } catch (error) {
    res.status(500).send("Error en el servidor");
  }
});

router.post("/carts/:cid/product/:pid", async (req, res) => {
  try {
    const cartId = req.params.cid;
    const productId = req.params.pid;
    const quantity = 1;

    const cart = await cartModel.findOne({ cartId }).exec();

    if (!cart) {
      res.status(404).send("Carrito no encontrado");
      return;
    }

    const existingProduct = cart.products.find(
      (p) => p.productId === productId
    );

    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.products.push({ productId, quantity });
    }

    await cart.save();

    res.status(201).json(cart);
  } catch (error) {
    res.status(500).send("Error en el servidor");
  }
});

router.post("/carts/product/:pid", async (req, res) => {
  try {
    const productId = req.params.pid;
    const quantity = 1;

    const product = await productModel.findOne({ productId }).exec();

    if (!product) {
      res.status(404).send("Producto no encontrado");
      return;
    }

    const cartlast = await cartModel
      .findOne()
      .sort({ cartId: -1 })
      .select("cartId")
      .exec();

    const nextcartId = cartlast ? parseInt(cartlast.cartId) + 1 : 1;
    console.log({ nextcartId, cartlast });

    const newCart = new cartModel({
      cartId: nextcartId,
      products: [{ productId, quantity }],
    });
    await newCart.save();

    res.status(201).json(newCart);
  } catch (error) {
    console.log(error);
    res.status(500).send("***Error en el servidor");
  }
});

router.delete("/carts/:cid/product/:pid", async (req, res) => {
  try {
    const cartId = req.params.cid;
    const productIdToFind = req.params.pid;

    const validObjectId = ObjectId.isValid(cartId)
      ? new ObjectId(cartId)
      : null;
    if (!validObjectId) {
      res.status(404).send("Identificador del carrito invalido");
    } else {
      const cart = await cartModel.findOne({ _id: cartId }).exec();

      if (!cart) {
        res.status(404).send("Carrito no encontrado");
        return;
      }

      const validObjectId = ObjectId.isValid(productIdToFind)
        ? new ObjectId(productIdToFind)
        : null;

      if (!validObjectId) {
        res.status(404).send("Identificador de Producto invalido");
      } else {
        const indice = cart.products.findIndex(
          (product) => String(product.productId) === productIdToFind
        );
        if (indice !== -1) {
          cart.products.splice(indice, 1);
        } else {
          res.status(404).send("Producto no encontrado");
          return;
        }
      }

      await cart.save();
      res.status(201).json(cart);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en el servidor");
  }
});

router.delete("/carts/:cid", async (req, res) => {
  try {
    const cartId = req.params.cid;

    const cart = await cartModel.findOne({ cartId }).exec();
    if (!cart) return res.status(404).send("Carrito no encontrado");

    const resp = await cartModel.deleteOne({
      id: cartId,
    });
    console.log({ resp: await resp.json() });
  } catch (error) {
    console.error(error);
  }
});

router.put("/carts/:cid/product/:pid", async (req, res) => {
  try {
    const cartId = req.params.cid;
    const productIdToFind = req.params.pid;
    const cantidad = parseInt(req.body.quantity);
    if (isNaN(cantidad) || cantidad <= 0) {
      res
        .status(404)
        .send("La cantidad debe ser un número positivo mayor que cero");
      return;
    }
    const validObjectId = ObjectId.isValid(cartId)
      ? new ObjectId(cartId)
      : null;
    if (!validObjectId) {
      res.status(404).send("Identificador del carrito invalido");
    } else {
      const cart = await cartModel.findOne({ _id: cartId }).exec();
      if (!cart) {
        res.status(404).send("Carrito no encontrado");
        return;
      }
      const indice = cart.products.findIndex(
        (product) => String(product.productId) === productIdToFind
      );
      if (indice !== -1) {
        cart.products[indice].quantity = cantidad;
        await cart.save();
        res.status(201).json(cart);
      } else {
        res.status(404).send("Producto no encontrado");
        return;
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en el servidor");
  }
});


router.put("/carts/:cid", async (req, res) => {
  try {
    const cartId = req.params.cid;
    const nuevoCarrito = req.body;
    const validObjectId = ObjectId.isValid(cartId)
      ? new ObjectId(cartId)
      : null;
    if (!validObjectId) {
      res.status(404).send("Identificador del carrito invalido");
      return;
    }
    const cart = await cartModel.findOne({ _id: cartId }).exec();
    if (!cart) {
      res.status(404).send("Carrito no encontrado");
      return;
    }

    if (
      Array.isArray(nuevoCarrito.products) &&
      nuevoCarrito.products.length > 0
    ) {
      const validacionExitosa = await Promise.all(
        nuevoCarrito.products.map(async (item) => {
          if (!ObjectId.isValid(item.productId)) {
            return false;
          }

          const productExists = await productModel.exists({
            _id: item.productId,
          });

          return (
            productExists &&
            typeof item.quantity === "number" &&
            item.quantity > 0
          );
        })
      );

      if (validacionExitosa.every((isValid) => isValid)) {
        cart.products = nuevoCarrito.products;

        await cart.save();
        res.status(200).json({ mensaje: "Carrito actualizado con éxito" });
      } else {
        res
          .status(400)
          .json({ error: "El contenido del carrito no es válido" });
      }
    } else {
      res
        .status(400)
        .json({ error: "El contenido del carrito esta vacio o no es valido" });
    }
  } catch (error) {
    res.status(500).send("Error en el servidor");
  }
});

const validateAddProduct = [
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateUpdateProduct = [
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

router.get("/products", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    const page = getPage(req.query.page);
    const sort = req.query.sort
      ? req.query.sort === "asc"
        ? 1
        : -1
      : undefined;
    const query = req.query.query;

    const products = await productModel
      .find(query ? { category: { $regex: query, $options: "i" } } : undefined)
      .sort(sort ? { price: sort } : undefined)
      .limit(limit)
      .skip((page - 1) * limit)
      .lean()
      .exec();

    const productsCount = await productModel.find().count().exec();

    const totalPages = Math.ceil((productsCount ?? 0) / (limit ?? 1));
    res.status(200).json({
      status: 200,
      payload: products,
      totalPages,
      page,
      nextPage: page + 1,
      hasNextPage: page < totalPages,
      prevPage: page - 1,
      hasPrevPage: page - 1 > 0,
      nextLink: null,
      prevLink: null,
    });
  } catch (error) {
    console.log({ error });
    res.status(500).send(error);
  }
});

router.get("/products/:pid", async (req, res) => {
  try {
    const productId = req.params.pid;
    const product = await productModel.findOne({ productId }).exec();
    if (product) {
      res.json(product);
    } else {
      res.status(404).send("Producto no encontrado");
    }
  } catch (error) {
    res.status(500).send("Error en el servidor");
  }
});

router.post("/products", async (req, res) => {
  try {
    const newProduct = req.body;

    const existingProduct = await productModel
      .findOne({ code: newProduct.code })
      .exec();
    if (existingProduct) {
      res.status(400).send("El producto con este código ya existe");
      return;
    }

    const productlast = await productModel
      .findOne()
      .sort({ productId: -1 })
      .select("productId")
      .exec();

    const nextProductId = productlast ? productlast.productId + 1 : 1;
    const product = new productModel({
      ...newProduct,
      productId: nextProductId,
    });

    try {
      await product.save();
    } catch (error) {
      console.log(error);
    }

    res.status(201).json(product);
  } catch (error) {
    res.status(500).send("Error en el servidor");
  }
});

router.put("/products/:pid", validateUpdateProduct, async (req, res) => {
  try {
    const productId = req.params.pid;
    const updatedProduct = req.body;

    const product = await productModel.findOne({ productId }).exec();

    if (!product) {
      res.status(404).send("Producto no encontrado");
      return;
    }
    for (const key in updatedProduct) {
      if (updatedProduct.hasOwnProperty(key)) {
        product[key] = updatedProduct[key];
      }
    }
    await product.save();
    res.status(200).json(product);
  } catch (error) {
    res.status(500).send("Error en el servidor");
  }
});

router.delete("/products/:pid", async (req, res) => {
  try {
    const productId = req.params.pid;

    const product = await productModel.findOne({ productId }).exec();

    if (!product) {
      res.status(404).send("Producto no encontrado");
      return;
    }

    await Product.deleteOne({ productId }).exec();

    res.status(200).send(`Producto con ID ${productId} eliminado`);
  } catch (error) {
    res.status(500).send("Error en el servidor");
  }
});

export default router;
