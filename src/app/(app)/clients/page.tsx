"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layouts/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { fetchRoster } from "@/lib/roster";
import type { RosterClient } from "@/types/roster";
import { Users } from "lucide-react";

export default function ClientsPage() {
  const [roster, setRoster] = useState<RosterClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoster()
      .then(setRoster)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Clients" subtitle="Your roster and client groups" />
      
      <div className="px-5 py-6">
        {loading && (
          <div className="text-center py-16 text-gray-500">
            Loading roster...
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-red-600">
            Error loading roster: {error}
          </div>
        )}

        {!loading && !error && roster.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No clients yet</p>
            <p className="text-sm mt-2">Your client roster will appear here</p>
          </div>
        )}

        {!loading && !error && roster.length > 0 && (
          <div className="space-y-3 max-w-2xl mx-auto">
            {roster.map((client) => (
              <Card key={client.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {client.status}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
