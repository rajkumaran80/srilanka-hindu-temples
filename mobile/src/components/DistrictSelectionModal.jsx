const DistrictSelectionModal = ({ showModal, sriLankaDistricts, startDistrict, setStartDistrict, endDistrict, setEndDistrict, optimizeRoute, setOptimizeRoute, proceedToSelection }) => {
  if (!showModal) return null;

  return (
    <div className="tour-modal-overlay">
      <div className="tour-modal">
        <div className="modal-header">
          <h2>🗺️ Plan Your Temple Tour</h2>
          <p>Select your starting and ending districts</p>
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

            <div className="selector-group">
              <label>
                <input
                  type="checkbox"
                  checked={optimizeRoute}
                  onChange={(e) => setOptimizeRoute(e.target.checked)}
                />
                Optimize Route (rearrange temples for efficiency)
              </label>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="primary-button"
            onClick={proceedToSelection}
            disabled={!startDistrict || !endDistrict}
          >
            Continue to Temple Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default DistrictSelectionModal;
