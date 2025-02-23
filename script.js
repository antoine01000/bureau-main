/**************************************************************
 * script.js - Page principale (Gestion des Tâches Ménagères)
 **************************************************************/

const supabase = window.supabaseClient;

// Sélecteurs DOM
const roomSelect = document.getElementById('roomSelect');
const taskSuggestions = document.getElementById('taskSuggestions');
const assigneeSelect = document.getElementById('assigneeSelect');
const statusSelect = document.getElementById('statusSelect');
const addTaskButton = document.getElementById('addTask');
const taskList = document.getElementById('taskList');
const filterButtons = document.querySelectorAll('.filter-btn');

/* --- Fonctions pour interagir avec Supabase --- */

// Récupérer les pièces
async function fetchRooms() {
  const { data, error } = await supabase.from('rooms').select('*');
  if (error) {
    console.error("Erreur fetchRooms:", error);
    return [];
  }
  return data;
}

// Récupérer les suggestions de tâches pour une pièce donnée
async function fetchTaskSuggestions(roomKey) {
  const { data, error } = await supabase
    .from('task_suggestions')
    .select('*')
    .eq('room', roomKey)
    .order('id', { ascending: true });
  if (error) {
    console.error("Erreur fetchTaskSuggestions:", error);
    return [];
  }
  return data;
}

// Récupérer les tâches avec une jointure LEFT sur rooms pour inclure toutes les tâches
async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, rooms(name)');
  if (error) {
    console.error("Erreur fetchTasks:", error);
    return [];
  }
  return data;
}

// Récupérer les personnes
async function fetchPeople() {
  const { data, error } = await supabase.from('people').select('*');
  if (error) {
    console.error("Erreur fetchPeople:", error);
    return [];
  }
  return data;
}

// Insertion d'une nouvelle tâche
async function insertTask(taskName, assignee, roomId, status) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      name: taskName,
      assignee: assignee,
      room_id: parseInt(roomId),
      status: status
    }])
    .select();
  if (error) {
    console.error("Erreur insertTask:", error);
  } else {
    console.log("Tâche insérée :", data);
  }
  return data;
}

// Suppression d'une tâche
async function deleteTaskInDB(taskId) {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  if (error) {
    console.error("Erreur deleteTaskInDB:", error);
  }
  return data;
}

/* --- Fonctions de rendu --- */

// Remplir le sélecteur des pièces
async function renderRooms() {
  roomSelect.innerHTML = '<option value="">Choisir une pièce...</option>';
  const rooms = await fetchRooms();
  rooms.forEach(room => {
    const option = document.createElement('option');
    option.value = room.id;
    option.textContent = room.name;
    roomSelect.appendChild(option);
  });
}

// Remplir le sélecteur des personnes
async function renderMembers() {
  assigneeSelect.innerHTML = '<option value="">Choisir une personne...</option>';
  const people = await fetchPeople();
  people.forEach(person => {
    const option = document.createElement('option');
    option.value = person.name; // ou person.id selon vos besoins
    option.textContent = person.name;
    assigneeSelect.appendChild(option);
  });
}

// Remplir la liste déroulante des tâches suggérées pour la pièce sélectionnée
async function renderTaskSuggestions() {
  taskSuggestions.innerHTML = '';
  const selectedRoomId = roomSelect.value;
  if (selectedRoomId) {
    const roomName = roomSelect.options[roomSelect.selectedIndex].text;
    const roomKey = roomName.toLowerCase().replace(/\s+/g, '_').replace(/[éèê]/g, 'e');
    const suggestions = await fetchTaskSuggestions(roomKey);
    taskSuggestions.disabled = false;
    if (suggestions.length > 0) {
      taskSuggestions.innerHTML = `<option value="">Choisir une tâche suggérée...</option>` +
        suggestions.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    } else {
      taskSuggestions.innerHTML = `<option value="">Aucune suggestion</option>`;
    }
  } else {
    taskSuggestions.disabled = true;
    taskSuggestions.innerHTML = `<option value="">Sélectionnez d'abord une pièce...</option>`;
  }
}

// Afficher les tâches sous forme de ligne avec Tâche, Personne, Pièce et Statut
async function renderTasks(filter = 'active') {
  const tasks = await fetchTasks();
  console.log("Tâches récupérées :", tasks);
  const selectedRoomId = roomSelect.value;
  let filteredTasks = tasks;
  if (selectedRoomId) {
    filteredTasks = filteredTasks.filter(task => task.room_id == selectedRoomId);
  }
  if (filter === 'active') {
    // Afficher uniquement les tâches dont le statut n'est pas "terminé"
    filteredTasks = filteredTasks.filter(task => task.status !== 'terminé');
  } else if (filter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.status === filter);
  }
  taskList.innerHTML = '';
  if (filteredTasks.length === 0) {
    taskList.innerHTML = '<li>Aucune tâche</li>';
  } else {
    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      const roomName = task.rooms ? task.rooms.name : '';
      li.innerHTML = `
        <div class="task-info">
          <span class="task-name"><strong>Tâche :</strong> ${task.name}</span> | 
          <span class="task-assignee"><strong>Personne :</strong> ${task.assignee}</span> | 
          <span class="task-room"><strong>Pièce :</strong> ${roomName}</span> | 
          <span class="task-status"><strong>Statut :</strong> ${task.status}</span>
        </div>
        <div class="task-actions">
          <button class="delete-btn" onclick="deleteTask(${task.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      taskList.appendChild(li);
    });
  }
}

// Fonction pour supprimer une tâche et rafraîchir l'affichage
window.deleteTask = async function(taskId) {
  if (confirm("Voulez-vous vraiment supprimer cette tâche ?")) {
    await deleteTaskInDB(taskId);
    await renderTasks();
  }
}

/* --- Événements --- */

// Lors du changement de pièce, actualiser les suggestions et afficher les tâches correspondantes
roomSelect.addEventListener('change', async () => {
  await renderTaskSuggestions();
  await renderTasks();
});

// Ajout d'une nouvelle tâche via Supabase (en utilisant la tâche sélectionnée dans la liste déroulante)
addTaskButton.addEventListener('click', async () => {
  const roomId = roomSelect.value;
  const taskName = taskSuggestions.value.trim();
  const assignee = assigneeSelect.value;
  const status = statusSelect.value;
  
  if (roomId && taskName && assignee && status) {
    await insertTask(taskName, assignee, roomId, status);
    
    // Réinitialiser tous les filtres aux valeurs par défaut
    roomSelect.value = "";
    taskSuggestions.innerHTML = `<option value="">Sélectionnez d'abord une pièce...</option>`;
    taskSuggestions.disabled = true;
    assigneeSelect.value = "";
    statusSelect.value = "";
    
    // Réinitialiser les boutons de filtre (définir le filtre par défaut "active")
    filterButtons.forEach(btn => btn.classList.remove('active'));
    const defaultFilterButton = document.querySelector('.filter-btn[data-filter="active"]');
    if (defaultFilterButton) {
      defaultFilterButton.classList.add('active');
    }
    
    // Rafraîchir l'affichage des tâches et des suggestions
    await renderTaskSuggestions();
    await renderTasks();
  } else {
    alert("Veuillez remplir tous les champs.");
  }
});

// Filtrage des tâches via les boutons
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    renderTasks(button.dataset.filter);
  });
});

/* --- Initialisation --- */
(async function init() {
  await renderRooms();
  await renderMembers();
  await renderTaskSuggestions();
  await renderTasks();
})();
