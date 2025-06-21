
import { useParams, Navigate } from 'react-router-dom';

const LeadRedirect = () => {
  const { leadId } = useParams<{ leadId: string }>();
  
  if (!leadId) {
    return <Navigate to="/leads" replace />;
  }
  
  return <Navigate to={`/leads/${leadId}`} replace />;
};

export default LeadRedirect;
