/**
 *
 */
function decomposeObjectID(acRecordObjectId: string) {
  const parts = acRecordObjectId.split('-');
  if (parts.length !== 2) {
    throw new Error('Invalid acRecordObjectId format');
  }

  const [type, sequence] = parts;
  const isNumericType = /^\d+$/.test(type); // Checks if 'type' is fully numeric

  return {
    type,
    sequence,
    isNumericType,
  };
}

export {decomposeObjectID};
