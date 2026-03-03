"use client";

import { useRouter } from "next/navigation";
import { Icons } from "@/components/shared/Icons";

interface ActionButtonsProps {
  actions: string[];
}

// Map action labels to navigation targets and icon components
const ACTION_CONFIG: Record<
  string,
  { icon: keyof typeof Icons; route?: string }
> = {
  "生成尽调报告": { icon: "Doc", route: "/workspace/agent/risk" },
  "舆情分析": { icon: "Alert", route: "/workspace/agent/sentiment" },
  "科创评估": { icon: "Brain", route: "/workspace/agent/tech" },
  "查看可视化": { icon: "BarChart", route: "/workspace/datashow" },
  "关系图谱": { icon: "Network", route: "/workspace/datashow" },
  "导出数据": { icon: "Export" },
  "深入分析": { icon: "Search" },
  "查看详情": { icon: "ArrowRight" },
};

export function ActionButtons({ actions }: ActionButtonsProps) {
  const router = useRouter();

  if (!actions || actions.length === 0) return null;

  const handleClick = (action: string) => {
    const config = ACTION_CONFIG[action];
    if (config?.route) {
      router.push(config.route);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3 animate-fadeIn">
      {actions.map((action, i) => {
        const config = ACTION_CONFIG[action] || { icon: "ArrowRight" };
        const IconComponent = Icons[config.icon];

        return (
          <button
            key={i}
            onClick={() => handleClick(action)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] text-chat bg-chat/[0.1] border border-chat/[0.2] hover:bg-chat/[0.16] hover:border-chat/[0.3] transition-all duration-200 cursor-pointer"
          >
            <IconComponent size={13} />
            {action}
          </button>
        );
      })}
    </div>
  );
}
