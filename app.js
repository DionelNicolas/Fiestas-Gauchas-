
const caja = document.querySelector('#events');

if (caja) {
  caja.innerHTML = `
    <div style="background:#dcebdc;padding:20px;border-radius:15px;color:#234b36">
      <h2>¡Prueba exitosa!</h2>
      <p>JavaScript puede mostrar contenido en Fiestas gauchas.</p>
      <p>Estamos recuperando los eventos.</p>
    </div>
  `;
} else {
  alert('No se encontró el espacio de eventos.');
}
