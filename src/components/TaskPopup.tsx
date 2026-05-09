import { format } from 'date-fns'
import type { Task } from '../services/supabase'

interface Props {
  date: Date
  tasks: Task[]
  onClose: () => void
}

export default function TaskPopup({ date, tasks, onClose }: Props) {
  return (
    <div className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-72 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">
          {format(date, 'EEEE, MMMM d')}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No tasks for this day.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="bg-indigo-50 rounded-lg p-2">
              <div className="flex items-start gap-2">
                {task.task_time && (
                  <span className="text-xs text-indigo-500 font-mono pt-0.5 shrink-0">
                    {task.task_time.slice(0, 5)}
                  </span>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-800">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
