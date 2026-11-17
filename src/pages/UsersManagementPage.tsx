import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { User } from '../types';

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<number[]>([5]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authAPI.getUsers();
        if (res.success && res.users) {
          setUsers(res.users);
        }
      } catch {
        //
      }
    };
    load();
  }, []);

  const handleToggleBlock = (id: number) => {
    setBlockedUserIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#172033]">Registered Users</h2>

        <div className="overflow-x-auto rounded-lg border border-[#E2E8F0]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EAF0F8] text-[#172033] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">ID</th>
                <th className="py-2.5 px-3.5">Name</th>
                <th className="py-2.5 px-3.5">E-mail</th>
                <th className="py-2.5 px-3.5">Role</th>
                <th className="py-2.5 px-3.5">Status</th>
                <th className="py-2.5 px-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[#172033]">
              {users.length > 0 ? (
                users.map(u => {
                  const isBlocked = blockedUserIds.includes(u.id);
                  const isSuperAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3.5 font-medium">{u.id}</td>
                      <td className="py-2.5 px-3.5 font-medium">{u.name}</td>
                      <td className="py-2.5 px-3.5 text-[#697586]">{u.email}</td>
                      <td className="py-2.5 px-3.5 font-semibold text-[#172033]">{u.role}</td>
                      <td className="py-2.5 px-3.5">
                        {isBlocked ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#DC2626]">
                            Blocked
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        {isSuperAdmin ? (
                          <span className="text-[#697586]">-</span>
                        ) : isBlocked ? (
                          <button
                            onClick={() => handleToggleBlock(u.id)}
                            className="px-3 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-semibold shadow-xs"
                          >
                            Unblock
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleBlock(u.id)}
                            className="px-3 py-1 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-semibold shadow-xs"
                          >
                            Block
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">1</td>
                    <td className="py-2.5 px-3.5 font-medium">Admin</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">admin@parcelhub.in</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#172033]">ADMIN</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#697586]">-</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">2</td>
                    <td className="py-2.5 px-3.5 font-medium">QuickShip Traders</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">ops@quickship.in</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#172033]">VENDOR</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <button className="px-3 py-1 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-semibold shadow-xs">
                        Block
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">3</td>
                    <td className="py-2.5 px-3.5 font-medium">Urban Mart</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">hub@urbanmart.in</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#172033]">VENDOR</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <button className="px-3 py-1 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-semibold shadow-xs">
                        Block
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">4</td>
                    <td className="py-2.5 px-3.5 font-medium">Priya Kumar</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">priya.kumar@mail.com</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#172033]">CUSTOMER</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <button className="px-3 py-1 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-semibold shadow-xs">
                        Block
                      </button>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-3.5 font-medium">5</td>
                    <td className="py-2.5 px-3.5 font-medium">Arun Raj</td>
                    <td className="py-2.5 px-3.5 text-[#697586]">arun.raj@mail.com</td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#172033]">CUSTOMER</td>
                    <td className="py-2.5 px-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#DC2626]">
                        Blocked
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      <button className="px-3 py-1 rounded bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-semibold shadow-xs">
                        Unblock
                      </button>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
