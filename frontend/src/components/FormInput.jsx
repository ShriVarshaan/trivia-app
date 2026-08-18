function FormInput({ label, type, name, id, placeholder, value, onChange }) {
    return (
        <div className="form-group">
            <label htmlFor={id}>{label}</label>
            <input 
                className="input-field"
                type={type} 
                name={name} 
                id={id} 
                placeholder={placeholder} 
                value={value} 
                onChange={(e) => onChange(e.target.value)} 
                required
            />
        </div>
    );
}

export default FormInput;