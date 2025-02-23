/**************************************************************
 * admin.js - Page Admin (Gestion du système)
 * Gestion des personnes et des pièces avec suggestions de tâches.
 **************************************************************/

const supabase = window.supabaseClient;

/**************************************************************
 * Fonctions Supabase - People
 **************************************************************/
async function fetchPeople() {
  const { data, error } = await supabase.from('people').select('*');
  if (error) {
    console.error('fetchPeople error:', error);
    return [];
  }
  return data;
}
async function insertPerson(name) {
  await supabase.from('people').insert([{ name }]);
}
async function deletePersonById(id) {
  await supabase.from('people').delete().eq('id', id);
}

/**************************************************************
 * Fonctions Supabase - Rooms
 **************************************************************/
async function fetchRooms() {
  const { data, error } = await supabase.from('rooms').select('*');
  if (error) {
    console.error('fetchRooms error:', error);
    return [];
  }
  return data;
}
async function insertRoom(name) {
  await supabase.from('rooms').insert([{ name }]);
}
async function deleteRoomById(id) {
  await supabase.from('rooms').delete().eq('id', id);
}
async function updateRoomName(id, newName) {
  await supabase.from('rooms').update({ name: newName }).eq('id', id);
}

/**************************************************************
 * Fonctions Supabase - Task Suggestions
 * Ces fonctions interagissent avec la table task_suggestions
 **************************************************************/
async function fetchTaskSuggestionsForRoom(roomKey) {
  const { data, error } = await supabase
    .from('task_suggestions')
    .select('*')
    .eq('room', roomKey)
    .order('id', { ascending: true });
  if (error) {
    console.error('fetchTaskSuggestionsForRoom error:', error);
    return [];
  }
  return data;
}
async function insertTaskSuggestion(roomKey, suggestionName) {
  const { data, error } = await supabase
    .from('task_suggestions')
    .insert([{ room: roomKey, name: suggestionName }])
    .select();
  if (error) {
    console.error('insertTaskSuggestion error:', error);
    return null;
  }
  return data;
}
async function updateTaskSuggestion(id, newName) {
  const { data, error } = await supabase
    .from('task_suggestions')
    .update({ name: newName })
    .eq('id', id)
    .select();
  if (error) {
    console.error('updateTaskSuggestion error:', error);
    return null;
  }
  return data;
}
async function deleteTaskSuggestion(id) {
  const { data, error } = await supabase
    .from('task_suggestions')
    .delete()
    .eq('id', id)
    .select();
  if (error) {
    console.error('deleteTaskSuggestion error:', error);
    return null;
  }
  return data;
}

/**************************************************************
 * Rendu People
 **************************************************************/
async function renderPeople() {
  const people = await fetchPeople();
  const peopleList = document.getElementById('peopleList');
  peopleList.innerHTML = '';
  people.forEach(person => {
    const li = document.createElement('li');
    li.innerHTML = `
      ${person.name}
      <div class="item-actions">
        <button class="delete-btn" data-id="${person.id}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    peopleList.appendChild(li);
  });
  peopleList.querySelectorAll('button.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Supprimer cette personne ?')) {
        await deletePersonById(id);
        renderPeople();
      }
    });
  });
}

/**************************************************************
 * Rendu Rooms et Tâches Suggérées (arborescence)
 **************************************************************/
async function renderTaskSuggestionsForRoom(room) {
  // Normalisation du nom de la pièce pour matcher le champ "room" de task_suggestions
  const roomKey = room.name.toLowerCase().replace(/\s+/g, '_').replace(/[éèê]/g, 'e');
  const suggestions = await fetchTaskSuggestionsForRoom(roomKey);
  const suggestionsList = document.getElementById(`suggestions-${room.id}`);
  suggestionsList.innerHTML = '';
  suggestions.forEach(suggestion => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="suggestion-name" data-id="${suggestion.id}">${suggestion.name}</span>
      <div class="item-actions">
        <button class="edit-suggestion-btn" data-id="${suggestion.id}"><i class="fas fa-edit"></i></button>
        <button class="delete-suggestion-btn" data-id="${suggestion.id}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    suggestionsList.appendChild(li);

    // Édition de la suggestion
    li.querySelector('.edit-suggestion-btn').addEventListener('click', () => {
      const span = li.querySelector('.suggestion-name');
      const currentName = span.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.classList.add('edit-suggestion-input');
      li.insertBefore(input, span);
      li.removeChild(span);
      const editBtn = li.querySelector('.edit-suggestion-btn');
      editBtn.innerHTML = '<i class="fas fa-save"></i>';
      // Lorsque l'on clique sur "sauvegarder"
      editBtn.addEventListener('click', async function saveHandler() {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          await updateTaskSuggestion(suggestion.id, newName);
        }
        renderTaskSuggestionsForRoom(room);
        editBtn.removeEventListener('click', saveHandler);
      });
    });

    // Suppression de la suggestion
    li.querySelector('.delete-suggestion-btn').addEventListener('click', async () => {
      if (confirm("Supprimer cette tâche suggérée ?")) {
        await deleteTaskSuggestion(suggestion.id);
        renderTaskSuggestionsForRoom(room);
      }
    });
  });
}

async function renderRooms() {
  const rooms = await fetchRooms();
  const roomsList = document.getElementById('roomsList');
  const roomSelect = document.getElementById('roomSelect');
  roomsList.innerHTML = '';
  roomSelect.innerHTML = '<option value="">Choisir une pièce...</option>';
  rooms.forEach(room => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="room-header">
        <span class="room-name">${room.name}</span>
        <div class="item-actions">
          <button class="delete-btn" data-id="${room.id}"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <ul class="suggestions-list" id="suggestions-${room.id}"></ul>
      <div class="add-suggestion">
        <input type="text" placeholder="Nouvelle tâche suggérée" id="newSuggestion-${room.id}">
        <button class="add-suggestion-btn" data-room-id="${room.id}" data-room-name="${room.name}">+</button>
      </div>
    `;
    roomsList.appendChild(li);
    const option = document.createElement('option');
    option.value = room.id;
    option.textContent = room.name;
    roomSelect.appendChild(option);

    li.querySelector('.delete-btn').addEventListener('click', async () => {
      if (confirm('Supprimer cette pièce ?')) {
        await deleteRoomById(room.id);
        renderRooms();
      }
    });

    li.querySelector('.add-suggestion-btn').addEventListener('click', async () => {
      const roomName = room.name;
      const roomKey = roomName.toLowerCase().replace(/\s+/g, '_').replace(/[éèê]/g, 'e');
      const input = document.getElementById(`newSuggestion-${room.id}`);
      const suggestionName = input.value.trim();
      if (suggestionName) {
        await insertTaskSuggestion(roomKey, suggestionName);
        input.value = '';
        renderTaskSuggestionsForRoom(room);
      }
    });

    renderTaskSuggestionsForRoom(room);
  });
}

/**************************************************************
 * Événements
 **************************************************************/
// Ajout de personne via Supabase
document.getElementById('addPerson').addEventListener('click', async () => {
  const name = document.getElementById('newPersonName').value.trim();
  if (name) {
    await insertPerson(name);
    renderPeople();
    document.getElementById('newPersonName').value = '';
  }
});

// Ajout d'une pièce via Supabase
document.getElementById('addRoom').addEventListener('click', async () => {
  const name = document.getElementById('newRoomName').value.trim();
  if (name) {
    await insertRoom(name);
    renderRooms();
    document.getElementById('newRoomName').value = '';
  }
});

/**************************************************************
 * Initialisation
 **************************************************************/
(async function initAdmin() {
  await renderPeople();
  await renderRooms();
})();
