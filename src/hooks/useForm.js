import { useState } from 'react';

export function useForm(initialState) {
  const [formData, setFormData] = useState(initialState);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData(initialState);
  };

  return { formData, setFormData, handleChange, resetForm };
}
