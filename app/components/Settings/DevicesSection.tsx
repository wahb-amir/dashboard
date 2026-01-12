'use client';
import React from 'react';

export type Device = {
  id: string;
  name: string;
  lastSeen: string;
  current?: boolean;
};

interface Props {
  devices: Device[];
  loadingDevices: boolean;
  onLogoutDevice: (id: string) => void;
  onLogoutAll: () => void;
  onRefresh: () => void;
  onLogoutCurrent: () => void;
}

const DevicesSection: React.FC<Props> = ({
  devices,
  loadingDevices,
  onLogoutDevice,
  onLogoutAll,
  onRefresh,
  onLogoutCurrent,
}) => {
  return (
    <section className="bg-white shadow rounded p-4 mb-6">
      <h2 className="text-lg font-medium text-gray-700">Devices</h2>
      <p className="text-sm text-gray-700 mb-4">
        See how many devices have logged in with your account and log them out.
      </p>

      {loadingDevices ? (
        <div className="text-black">Loading devices…</div>
      ) : (
        <>
          <div className="mb-3 text-sm text-gray-700">
            Logged in devices: <strong>{devices.length}</strong>
          </div>

          <div className="space-y-2">
            {devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-gray-500">
                    Last seen: {new Date(d.lastSeen).toLocaleString()}
                  </div>
                  {d.current && <div className="text-xs text-green-600">Current session</div>}
                </div>
                <div className="flex gap-2">
                  {!d.current && (
                    <button
                      onClick={() => onLogoutDevice(d.id)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      Log out
                    </button>
                  )}
                  {d.current && (
                    <button
                      onClick={() => onLogoutCurrent()}
                      className="px-2 py-1 bg-red-500 text-white rounded text-sm"
                    >
                      Log out (this session)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={onLogoutAll} className="px-3 py-2 bg-red-600 text-white rounded text-sm">
              Log out all devices
            </button>
            <button onClick={onRefresh} className="px-3 py-2 border rounded text-sm text-black">
              Refresh devices
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default DevicesSection;
