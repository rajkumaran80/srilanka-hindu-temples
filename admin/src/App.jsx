import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [temples, setTemples] = useState([]);
  const [editingTemple, setEditingTemple] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    description: '',
    photos: [],
    temple_url: ''
  });

  useEffect(() => {
    fetchTemples();
  }, []);

  const fetchTemples = async () => {
    try {
      const response = await fetch('http://localhost:3001/temples');
      const data = await response.json();
      setTemples(data);
    } catch (error) {
      console.error('Error fetching temples:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTemple) {
        await fetch(`http://localhost:3001/temples/${editingTemple.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        await fetch('http://localhost:3001/temples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }
      fetchTemples();
      setFormData({ name: '', latitude: '', longitude: '', description: '', photos: [], temple_url: '' });
      setEditingTemple(null);
    } catch (error) {
      console.error('Error saving temple:', error);
    }
  };

  const handleEdit = (temple) => {
    setEditingTemple(temple);
    setFormData({
      name: temple.name,
      latitude: temple.latitude.toString(),
      longitude: temple.longitude.toString(),
      description: temple.description,
      photos: temple.photos,
      temple_url: temple.temple_url || ''
    });
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:3001/temples/${id}`, { method: 'DELETE' });
      fetchTemples();
    } catch (error) {
      console.error('Error deleting temple:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'photos') {
      setFormData({ ...formData, photos: value.split(',').map(url => url.trim()) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  return (
    <div className="App">
      <h1>Hindu Temples Admin Panel</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <h3>{editingTemple ? 'Edit Temple' : 'Add New Temple'}</h3>
        <input
          type="text"
          name="name"
          placeholder="Temple Name"
          value={formData.name}
          onChange={handleInputChange}
          required
        />
        <input
          type="number"
          name="latitude"
          placeholder="Latitude"
          value={formData.latitude}
          onChange={handleInputChange}
          step="any"
          required
        />
        <input
          type="number"
          name="longitude"
          placeholder="Longitude"
          value={formData.longitude}
          onChange={handleInputChange}
          step="any"
          required
        />
        <textarea
          name="description"
          placeholder="Description"
          value={formData.description}
          onChange={handleInputChange}
          required
        />
        <input
          type="text"
          name="photos"
          placeholder="Photos URLs (comma separated)"
          value={formData.photos.join(', ')}
          onChange={handleInputChange}
        />
        <input
          type="url"
          name="temple_url"
          placeholder="Temple Website"
          value={formData.temple_url}
          onChange={handleInputChange}
        />
        <button type="submit">{editingTemple ? 'Update' : 'Add'} Temple</button>
        {editingTemple && <button type="button" onClick={() => { setEditingTemple(null); setFormData({ name: '', latitude: '', longitude: '', description: '', photos: [], temple_url: '' }); }}>Cancel</button>}
      </form>

      <h2>Temples List</h2>
      <div className="temples-list">
        {temples.map(temple => (
          <div key={temple.id} className="temple-card">
            <h3>{temple.name}</h3>
            <p>{temple.description}</p>
            <button onClick={() => handleEdit(temple)}>Edit</button>
            <button onClick={() => handleDelete(temple.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
