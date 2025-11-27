export const SelectedTemplesModal = ({ show, onClose, selectedTemples, optimizeRoute, handleDragStart, handleDragOver, handleDrop, handleTempleSelect }) => {
  if (!show) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10000, // very high so it sits above the map
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '90%',
          maxWidth: '500px'
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Selected Temples ({selectedTemples.length})</h3>

        {!optimizeRoute && selectedTemples.length > 1 && (
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            💡 Drag and drop to reorder temples
          </p>
        )}

        <div style={{ marginBottom: '15px' }}>
          {selectedTemples.map((temple, index) => (
            <div
              key={temple.id}
              draggable={!optimizeRoute}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              style={{
                cursor: !optimizeRoute ? 'grab' : 'default',
                userSelect: 'none',
                padding: '8px',
                marginBottom: '5px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#f9f9f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{index + 1}. {temple.name}</span>
              <button
                onClick={() => handleTempleSelect(temple)}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};