import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';

export default function HomePage() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    client
      .get('/locations')
      .then((res) => setLocations(res.data))
      .catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Kỷ niệm 40 năm trường</h1>
      {locations[0] && (
        <Link
          className="mt-4 inline-block text-blue-600 underline"
          to={`/tour/${locations[0].slug}`}
        >
          Khám phá trường →
        </Link>
      )}
    </div>
  );
}