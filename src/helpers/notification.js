import Toastify from 'toastify-js';

export const notify = (text, type = 'info', duration = 5000) => {
  Toastify({
    text,
    duration,
    gravity: 'bottom',
    position: 'center',
    stopOnFocus: true,
    style: {
        background: type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : type === 'error' ? '#dc3545' : '#007bff'
    }
  }).showToast();
}