import React from 'react'
import Link from 'next/link'
import { DeleteTeamButtonDouble } from '@/components/delete-team-button-double'
import { deleteTeamAction } from '@/app/equipos/actions'

type AdminTeamsTabProps = {
  teams: any[]
}

export function AdminTeamsTab({ teams }: AdminTeamsTabProps) {
  return (
    <section className="shell-panel p-4 md:p-5 rounded-none space-y-4">
      <div className="border-b border-shell-line pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white italic">Full Teams Management</h2>
        <p className="text-xs text-slate-400">View and manage team parameters or delete with safety double-confirmation.</p>
      </div>

      <div className="overflow-x-auto border border-shell-line bg-black/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-shell-line bg-black/40 text-xxs font-black uppercase tracking-wider text-slate-400">
              <th className="p-3">Logo</th>
              <th className="p-3">Team Name</th>
              <th className="p-3">Team Leader</th>
              <th className="p-3 text-center">Drivers</th>
              <th className="p-3">Categories</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs text-slate-300">
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 italic">No registered teams found on the platform.</td>
              </tr>
            ) : (
              teams.map((team) => {
                const leaderName = team.members.find((m: any) => m.role === 'owner')?.displayName || 'Unassigned'
                return (
                  <tr key={team.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3">
                      {team.logoUrl ? (
                        <img src={team.logoUrl} alt={team.name} className="h-8 w-8 object-contain" />
                      ) : (
                        <div className="h-8 w-8 bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-extrabold text-[10px]">
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-bold text-white">{team.name}</td>
                    <td className="p-3 text-slate-300">{leaderName}</td>
                    <td className="p-3 text-center font-bold text-cyan-400">{team.members.length}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {team.classTags && team.classTags.length > 0 ? (
                          team.classTags.map((tag: string) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-white/5 border border-white/10 text-[9px] font-extrabold uppercase text-slate-300">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic text-[10px]">None</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/equipos/${team.id}`}
                          className="inline-block border border-shell-line bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#1274de] hover:border-[#1274de] transition-colors"
                        >
                          Edit All
                        </Link>
                        <DeleteTeamButtonDouble
                          teamId={team.id}
                          teamName={team.name}
                          deleteAction={deleteTeamAction}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
