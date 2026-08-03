function FormInput({ label, type, name, id, placeholder, value, onChange }) {
    return (
        <div className={name}>
            <label htmlFor={id}>{label}</label>
            <input 
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