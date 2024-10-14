export function validateFields(form, fields = []) {
  if (fields.length <= 0) return true;

  let valid = true;
  const invalidFields = [];

  for (let i = 0; i < fields.length; i++) {
    const currentFieldName = fields[i];
    const currentFieldElement = form.elements[currentFieldName];
    const isCurrentFieldValid = currentFieldElement.checkValidity();

    if (!isCurrentFieldValid) {
      valid = false;
      invalidFields.push(currentFieldName);
      currentFieldElement.classList.add('input-invalid');
      continue;
    }

    currentFieldElement.classList.remove('input-invalid');
  }

  if (invalidFields.length > 0) {
    const [firstInvalidField] = invalidFields;
    form.elements[firstInvalidField].reportValidity();
  }

  return valid;
}
