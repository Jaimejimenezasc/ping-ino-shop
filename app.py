from flask_cors import CORS
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
CORS(app)  # ← Esta línea es la clave



app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'supersecreto'

db = SQLAlchemy(app)

# MODELOS
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    categoria = db.Column(db.String(50))
    color = db.Column(db.String(50))
    talla = db.Column(db.String(10))
    stock = db.Column(db.Integer, default=0)
    precio = db.Column(db.Float, nullable=False)

class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    direccion = db.Column(db.String(200))

class Pedido(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.utcnow)
    total = db.Column(db.Float, nullable=False)
    productos = db.Column(db.Text)
    cliente = db.relationship('Cliente')

# ORDEN POR TALLA
TALLA_ORDEN = {'XS': 0, 'S': 1, 'M': 2, 'L': 3, 'XL': 4, 'XXL': 5}

def ordenar_productos(productos):
    return sorted(productos, key=lambda p: (p.nombre, p.color, TALLA_ORDEN.get(p.talla.upper(), 99)))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        usuario = request.form.get('usuario')
        contraseña = request.form.get('contraseña')
        
        if usuario == 'Jaimejj' and contraseña == 'Dechill':
            session['usuario'] = usuario
            return redirect(url_for('dashboard'))
        else:
            return render_template('login.html', error='Credenciales incorrectas')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('usuario', None)
    return redirect(url_for('login'))

@app.route('/')
def home():
    return redirect(url_for('dashboard'))

@app.route('/admin')
def dashboard():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html')

@app.route('/admin/productos', methods=['GET', 'POST'])
def admin_productos():
    if 'usuario' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        nombre = request.form['nombre']
        categoria = request.form['categoria']
        color = request.form['color']
        talla = request.form['talla']
        stock = int(request.form['stock'])
        precio = float(request.form['precio'])

        nuevo_producto = Producto(nombre=nombre, categoria=categoria, color=color, talla=talla, stock=stock, precio=precio)
        db.session.add(nuevo_producto)
        db.session.commit()
        return redirect(url_for('admin_productos'))

    query = Producto.query
    nombre = request.args.get('nombre')
    color = request.args.get('color')
    talla = request.args.get('talla')

    if nombre:
        query = query.filter(Producto.nombre.ilike(f"%{nombre}%"))
    if color:
        query = query.filter(Producto.color.ilike(f"%{color}%"))
    if talla:
        query = query.filter(Producto.talla.ilike(f"%{talla}%"))

    productos_db = query.all()
    productos = ordenar_productos(productos_db)
    return render_template('productos.html', productos=productos)

@app.route('/admin/pedidos')
def admin_pedidos():
    if 'usuario' not in session:
        return redirect(url_for('login'))

    cliente_nombre = request.args.get('cliente')
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')

    pedidos_query = Pedido.query.join(Cliente)

    if cliente_nombre:
        pedidos_query = pedidos_query.filter(Cliente.nombre.ilike(f"%{cliente_nombre}%"))

    if fecha_inicio:
        fecha_inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d")
        pedidos_query = pedidos_query.filter(Pedido.fecha >= fecha_inicio_dt)

    if fecha_fin:
        fecha_fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d")
        pedidos_query = pedidos_query.filter(Pedido.fecha <= fecha_fin_dt)

    pedidos = pedidos_query.order_by(Pedido.fecha.desc()).all()
    return render_template('pedidos.html', pedidos=pedidos)

@app.route('/admin/clientes')
def admin_clientes():
    if 'usuario' not in session:
        return redirect(url_for('login'))

    query = Cliente.query
    nombre = request.args.get('nombre')
    email = request.args.get('email')

    if nombre:
        query = query.filter(Cliente.nombre.ilike(f"%{nombre}%"))
    if email:
        query = query.filter(Cliente.email.ilike(f"%{email}%"))

    clientes = query.all()
    return render_template('clientes.html', clientes=clientes)

@app.route('/eliminar/<int:id>')
def eliminar(id):
    if 'usuario' not in session:
        return redirect(url_for('login'))
    producto = Producto.query.get_or_404(id)
    db.session.delete(producto)
    db.session.commit()
    return redirect(url_for('admin_productos'))

@app.route('/editar/<int:id>', methods=['GET', 'POST'])
def editar(id):
    if 'usuario' not in session:
        return redirect(url_for('login'))
    producto = Producto.query.get_or_404(id)
    if request.method == 'POST':
        producto.nombre = request.form['nombre']
        producto.categoria = request.form['categoria']
        producto.color = request.form['color']
        producto.talla = request.form['talla']
        producto.stock = int(request.form['stock'])
        producto.precio = float(request.form['precio'])
        db.session.commit()
        return redirect(url_for('admin_productos'))
    return render_template('editar_producto.html', producto=producto)

@app.route('/actualizar_stock/<int:id>', methods=['POST'])
def actualizar_stock(id):
    if 'usuario' not in session:
        return redirect(url_for('login'))
    producto = Producto.query.get_or_404(id)
    nuevo_stock = request.form.get('nuevo_stock')
    if nuevo_stock is not None:
        producto.stock = int(nuevo_stock)
        db.session.commit()
    return redirect(url_for('admin_productos'))

@app.route('/api/productos')
def api_productos():
    productos = Producto.query.all()

    def obtener_imagen(nombre):
        nombre = nombre.lower()
        if "camiseta" in nombre:
            return "https://printcopy.es/1179-superlarge_default/camiseta-blanca-de-algodon.jpg"
        elif "vaquero" in nombre or "jeans" in nombre:
            return "https://assets.laboutiqueofficielle.com/w_450,q_auto,f_auto/media/products/2024/08/29/lbo_433691_LBO_10701859-3577_20241031T150748_01.jpg"
        elif "chaqueta" in nombre:
            return "https://aneto.store/1442-large_default/benisport-chaqueta-deportiva-roja-alamo.jpg"
        else:
            return "https://via.placeholder.com/200x250?text=" + nombre.replace(" ", "+")

    return jsonify([{
        "id": p.id,
        "nombre": p.nombre,
        "categoria": p.categoria,
        "color": p.color,
        "talla": p.talla,
        "stock": p.stock,
        "precio": p.precio,
        "imagen": obtener_imagen(p.nombre)
    } for p in productos])

@app.route('/api/pedido', methods=['POST'])
def api_pedido():
    data = request.json
    nombre = data['nombre']
    email = data['email']
    direccion = data['direccion']
    carrito = data['carrito']

    cliente = Cliente(nombre=nombre, email=email, direccion=direccion)
    db.session.add(cliente)
    db.session.commit()

    total = sum(item['precio'] for item in carrito)
    productos_txt = ", ".join([f"{item['producto']} ({item['color']}, {item['talla']})" for item in carrito])

    pedido = Pedido(cliente_id=cliente.id, total=total, productos=productos_txt)
    db.session.add(pedido)

    for item in carrito:
        p = Producto.query.filter_by(nombre=item['producto'], color=item['color'], talla=item['talla']).first()
        if p and p.stock >= 1:
            p.stock -= 1

    db.session.commit()
    return jsonify({"success": True})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
