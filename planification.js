/**************************************************************
 * planification.js - Page Planification
 **************************************************************/

const supabase = window.supabaseClient;

async function fetchRoomsWithTasks() {
  // Récupère toutes les pièces
  const { data: allRooms, error: err1 } = await supabase.from('rooms').select('*');
  if (err1) {
    console.error(err1);
    return [];
  }
  // Récupère toutes les tâches
  const { data: allTasks, error: err2 } = await supabase.from('tasks').select('*');
  if (err2) {
    console.error(err2);
    return [];
  }
  // Associe pour chaque room ses tâches
  const roomsWithTasks = allRooms.map(room => ({
    ...room,
    tasks: allTasks.filter(t => t.room_id === room.id)
  }));
  return roomsWithTasks;
}

async function renderPlanification() {
  const container = document.getElementById('planificationContainer');
  container.innerHTML = '';
  const rooms = await fetchRoomsWithTasks();
  rooms.forEach(room => {
    const roomDiv = document.createElement('div');
    roomDiv.classList.add('room-block');
    const roomTitle = document.createElement('h2');
    roomTitle.textContent = room.name;
    roomDiv.appendChild(roomTitle);
    if (room.tasks && room.tasks.length > 0) {
      const ul = document.createElement('ul');
      room.tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = task.name + (task.status ? ` [${task.status}]` : '');
        ul.appendChild(li);
      });
      roomDiv.appendChild(ul);
    } else {
      const p = document.createElement('p');
      p.textContent = 'Aucune tâche pour cette pièce.';
      roomDiv.appendChild(p);
    }
    container.appendChild(roomDiv);
  });
}

// Au chargement de la page
renderPlanification();
