import { format } from 'date-fns';

export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (error) {
    return '—';
  }
};
