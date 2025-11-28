const DistrictSelectionModal = ({ showModal, sriLankaDistricts, startDistrict, setStartDistrict, endDistrict, setEndDistrict, onOptimize, onKeepOrder, onClose }) => {
  if (!showModal) return null;

  return (
    <div className="tour-modal-overlay" onClick={onClose}>
      <div className="tour-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>

        <div className="modal-header">
          <h2>🗺️ Plan Your Temple Tour</h2>
          <p>Select your starting and ending districts, then choose your route optimization</p>
        </div>

        <div className="modal-content">
          <div className="district-selectors">
            <div className="selector-group">
              <label htmlFor="start-district">Starting District:</label>
              <select
                id="start-district"
                value={startDistrict}
                onChange={(e) => setStartDistrict(e.target.value)}
                className="district-select"
              >
                <option value="">Select starting district</option>
                {sriLankaDistricts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label htmlFor="end-district">Ending District:</label>
              <select
                id="end-district"
                value={endDistrict}
                onChange={(e) => setEndDistrict(e.target.value)}
                className="district-select"
              >
                <option value="">Select ending district</option>
                {sriLankaDistricts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            <div className="optimization-options">
              <div className="option-description">
                <h4>🚀 Optimize Route</h4>
                <p>Rearrange temples in the most efficient order to minimize travel distance and time.</p>
              </div>

              <div className="option-description">
                <h4>📋 Keep Current Order</h4>
                <p>Maintain the order in which you select temples.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="secondary-button"
            onClick={onKeepOrder}
            disabled={!startDistrict || !endDistrict}
          >
            Keep Current Order
          </button>
          <button
            className="primary-button"
            onClick={onOptimize}
            disabled={!startDistrict || !endDistrict}
          >
            Optimize Route
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistrictSelectionModal;
