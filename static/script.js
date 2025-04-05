let carrito = [];
let total = 0;
let tallaSeleccionada = null;
let productoSeleccionado = null;
let colorSeleccionado = null;
let productosBackend = [];

let seleccionTallas = {};  // Guardamos la talla seleccionada por producto

function seleccionarTalla(index, talla, stock) {
  seleccionTallas[index] = { talla, stock };
  document.getElementById(`stock-${index}`).textContent = `Talla seleccionada: ${talla}`;
}

function mostrarMensaje(texto, duracion = 3000) {
  const alerta = document.getElementById("mensaje-alerta");
  alerta.textContent = texto;
  alerta.style.display = "block";

  setTimeout(() => {
    alerta.style.display = "none";
  }, duracion);
}


function añadirAlCarrito(index) {
  if (!seleccionTallas[index]) {
    alert("Selecciona una talla primero.");
    return;
  }

  const producto = productosBackend[index];
  const talla = seleccionTallas[index].talla;
  const stock = seleccionTallas[index].stock;

  // Contar cuántas unidades de ese producto+talla ya hay en el carrito
  const cantidadActual = carrito.filter(item =>
    item.producto === producto.nombre &&
    item.color === producto.color &&
    item.talla === talla
  ).length;

  if (cantidadActual >= stock) {
    mostrarMensaje(`❌ Ya no quedan más unidades disponibles de la talla ${talla} (${stock} máximo).`);
    return;
  }
  

  const item = {
    producto: producto.nombre,
    color: producto.color,
    talla: talla,
    precio: producto.precio
  };

  carrito.push(item);
  total += producto.precio;
  actualizarCarrito();
  guardarCarrito();
  alert("Producto añadido al carrito");
}



function transformarProductos(lista) {
  const grupos = {};

  lista.forEach((p) => {
    const key = `${p.nombre}||${p.color}`;
    if (!grupos[key]) {
      grupos[key] = {
        nombre: p.nombre,
        color: p.color,
        categoria: p.categoria || "Otros",
        imagen: p.imagen, // o usa obtenerImagenProducto(p.nombre) si no viene del back
        precio: p.precio,
        tallas: []
      };
    }

    grupos[key].tallas.push({
      talla: p.talla,
      stock: p.stock
    });
  });

  return Object.values(grupos);
}

window.addEventListener("DOMContentLoaded", () => {
  cargarProductosDesdeBackend();

  const carritoGuardado = localStorage.getItem("carrito");
  if (carritoGuardado) {
    carrito = JSON.parse(carritoGuardado);
    total = carrito.reduce((acc, item) => acc + item.precio, 0);
    actualizarCarrito();
  }
});

async function cargarProductosDesdeBackend() {
  const contenedor = document.getElementById("lista-productos");
  contenedor.innerHTML = "";

  try {
    const res = await fetch("http://127.0.0.1:5000/api/productos");
    const data = await res.json();
    productosBackend = transformarProductos(data);  

    mostrarProductos(productosBackend);  // 👈 ya agrupados
  } catch (error) {
    contenedor.innerHTML = "<p>Error al cargar productos.</p>";
    console.error("Error al cargar productos:", error);
  }
}


function obtenerImagenProducto(nombre) {
  const nombreLower = nombre.toLowerCase();
  if (nombreLower.includes("camiseta")) return "https://printcopy.es/1179-superlarge_default/camiseta-blanca-de-algodon.jpg";
  if (nombreLower.includes("chaqueta")) return "https://aneto.store/1442-large_default/benisport-chaqueta-deportiva-roja-alamo.jpg";
  if (nombreLower.includes("vaquero") || nombreLower.includes("jean")) return "https://assets.laboutiqueofficielle.com/media/products/2024/08/29/lbo_433691_LBO_10701859-3577.jpg";
  return "https://via.placeholder.com/150";
}

function abrirModalDesdeObjeto(index) {
  const producto = productosBackend[index];
  productoSeleccionado = producto;
  colorSeleccionado = producto.color;
  tallaSeleccionada = producto.talla;

  document.getElementById("modal-nombre").textContent = producto.nombre;
  document.getElementById("modal-precio").textContent = producto.precio + "€";
  document.getElementById("modal-imagen").src = obtenerImagenProducto(producto.nombre);

  const tallas = ["XS", "S", "M", "L", "XL", "XXL"];
  const tallaDiv = document.querySelector(".tallas-opciones");
  tallaDiv.innerHTML = "";

  tallas.forEach(t => {
    const btn = document.createElement("button");
    btn.textContent = t;
    if (t === tallaSeleccionada) btn.classList.add("activo");

    btn.onclick = () => {
      tallaSeleccionada = t;
      document.querySelectorAll(".tallas-opciones button").forEach(b => b.classList.remove("activo"));
      btn.classList.add("activo");
    };

    tallaDiv.appendChild(btn);
  });

  document.getElementById("modal-producto").classList.add("active");
}

function cerrarModal() {
  document.getElementById("modal-producto").classList.remove("active");
}


function mostrarProductos(productos) {
  const contenedor = document.getElementById("lista-productos");
  contenedor.innerHTML = "";

  const categorias = {};
  productos.forEach((p, i) => {
    const cat = p.categoria || "Otros";
    if (!categorias[cat]) {
      categorias[cat] = [];
    }
    categorias[cat].push({ ...p, index: i });
  });

  for (const categoria in categorias) {
    const grupo = categorias[categoria];
    if (categoria !== "Otros") {
      contenedor.innerHTML += `<h2 style="margin-top: 30px; border-bottom: 2px solid #ccc;">${categoria}</h2>`;
    }

    grupo.forEach((p) => {
      const div = document.createElement("div");
      div.className = "producto";

      const ordenTallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const tallasOrdenadas = p.tallas.sort((a, b) => {
        const iA = ordenTallas.indexOf(a.talla.toUpperCase());
        const iB = ordenTallas.indexOf(b.talla.toUpperCase());
        return iA - iB;
      });

      const tallasHTML = tallasOrdenadas.map((t) =>
        `<button onclick="seleccionarTalla(${p.index}, '${t.talla}', ${t.stock})">${t.talla}</button>`
      ).join(" ");

      div.innerHTML = `
        <img src="${p.imagen}" alt="${p.nombre}">
        <h3>${p.nombre}</h3>
        <p class="color" data-valor="${p.color}">Color: ${p.color}</p>
        <div class="tallas">${tallasHTML}</div>
        <p class="stock" id="stock-${p.index}">Selecciona una talla</p>
        <p>${p.precio.toFixed(2)}€</p>
        <button class="accion" onclick="añadirAlCarrito(${p.index})">Añadir al carrito</button>
      `;


      contenedor.appendChild(div);
    });
  }
}



function añadirProductoDesdeModal() {
  if (!productoSeleccionado || !colorSeleccionado || !tallaSeleccionada) {
    alert("Por favor, selecciona una talla.");
    return;
  }

  carrito.push({
    producto: productoSeleccionado.nombre,
    precio: productoSeleccionado.precio,
    color: colorSeleccionado,
    talla: tallaSeleccionada
  });

  total += productoSeleccionado.precio;
  guardarCarrito();
  actualizarCarrito();
  cerrarModal();
}

function actualizarCarrito() {
  const lista = document.getElementById("lista-carrito");
  const totalElemento = document.getElementById("total");
  const contador = document.getElementById("contador-carrito");

  lista.innerHTML = "";
  carrito.forEach((item, index) => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${item.producto} (${item.color}, ${item.talla}) - ${item.precio}€
      <button onclick="eliminarDelCarrito(${index})">🗑️</button>
    `;
    lista.appendChild(li);
  });

  totalElemento.textContent = total.toFixed(2);
  contador.textContent = carrito.length;
}

function eliminarDelCarrito(index) {
  total -= carrito[index].precio;
  carrito.splice(index, 1);
  guardarCarrito();
  actualizarCarrito();
}

function vaciarCarrito() {
  if (confirm("¿Vaciar carrito?")) {
    carrito = [];
    total = 0;
    guardarCarrito();
    actualizarCarrito();
  }
}

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function toggleCarrito() {
  document.getElementById("carrito").classList.toggle("active");
}

function mostrarResumenCompra() {
  const resumen = document.getElementById("resumen-compra");

  if (carrito.length === 0) {
    resumen.innerHTML = "<p>Tu carrito está vacío.</p>";
    return;
  }

  resumen.innerHTML = carrito.map(item => 
    `<p>${item.producto} (${item.color}, ${item.talla}) - ${item.precio.toFixed(2)}€</p>`
  ).join("");
}


function toggleCheckout() {
  document.getElementById("checkout").classList.toggle("visible");
  mostrarResumenCompra();
}



let idiomaActual = localStorage.getItem("idioma") || "ES";

const traducciones = {
  ES: {
    inicio: "Inicio",
    catalogo: "Catálogo",
    buscar: "Buscar...",
    eslogan: "Rompe el hielo con tu estilo",
    subtitulo: "Moda fresca, cómoda y con personalidad. Solo en PINGÜINO 🐧",
    explorar: "Explorar colección",
    carrito: "Tu carrito",
    vaciar: "Vaciar carrito",
    pagar: "Ir a pagar",
    finalizar: "Finalizar compra",
    confirmar: "Confirmar compra",
    catalogoProductos: "Catálogo de Productos",
    color: "Color",
    seleccionarTalla: "Selecciona una talla",
    añadirCarrito: "Añadir al carrito"
  },
  EN: {
    inicio: "Home",
    catalogo: "Catalog",
    buscar: "Search...",
    eslogan: "Break the ice with your style",
    subtitulo: "Fresh, comfy and unique fashion. Only at PINGÜINO 🐧",
    explorar: "Explore collection",
    carrito: "Your cart",
    vaciar: "Empty cart",
    pagar: "Checkout",
    finalizar: "Finish order",
    confirmar: "Confirm order",
    catalogoProductos: "Product Catalog",
    catalogoProductos: "Product Catalog",
    color: "Color",
    seleccionarTalla: "Select a size",
    añadirCarrito: "Add to cart"    

  }
};

function cambiarIdioma() {
  idiomaActual = idiomaActual === "ES" ? "EN" : "ES";
  localStorage.setItem("idioma", idiomaActual);
  document.getElementById("idioma-btn").textContent = idiomaActual;
  aplicarTraducciones();
}

function aplicarTraducciones() {
  const t = traducciones[idiomaActual];

  document.querySelector("a[href='#inicio']").textContent = t.inicio;
  document.querySelector("a[href='#catalogo']").textContent = t.catalogo;
  document.getElementById("buscador").placeholder = t.buscar;

  document.querySelector("h1").textContent = t.eslogan;
  document.querySelector("p.subtitulo").textContent = t.subtitulo;
  document.getElementById("boton-explorar").textContent = t.explorar;

  document.querySelector("#carrito h2").textContent = t.carrito;
  document.querySelector("#carrito button:nth-of-type(1)").textContent = t.vaciar;
  document.querySelector("#carrito button:nth-of-type(2)").textContent = t.pagar;

  document.querySelector("#checkout h2").textContent = t.finalizar;
  document.querySelector("#checkout button[type='submit']").textContent = t.confirmar;
  // Título del catálogo
  const tituloCatalogo = document.querySelector("h2.titulo-catalogo");
  if (tituloCatalogo) tituloCatalogo.textContent = t.catalogoProductos;

  // Traducción dinámica de productos (si ya están cargados)
  document.querySelectorAll(".producto").forEach((div) => {
    const color = div.querySelector("p.color");
    const stock = div.querySelector("p.stock");
    const boton = div.querySelector("button.accion");

    if (color) color.textContent = `${t.color}: ${color.dataset.valor}`;
    if (stock) stock.textContent = t.seleccionarTalla;
    if (boton) boton.textContent = t.añadirCarrito;
});

}

window.addEventListener("DOMContentLoaded", aplicarTraducciones);




