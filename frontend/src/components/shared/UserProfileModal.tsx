"use client";

import { useRef, useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { Icons } from "@/components/shared/Icons";

const MOCK_USER = {
  name: "Wang Lei",
  email: "wang.lei@company.com",
  initial: "W",
  plan: "Enterprise",
  planColor: "#D2AE67",
  apiUsage: 78,
  apiTotal: "2,000,000 tokens / 月",
};

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const { theme, setTheme } = useAppStore();
  const modalRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState("简体中文");
  const isDark = theme === "dark";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const panelBg = isDark ? "rgba(8,12,24,0.97)" : "rgba(250,252,255,0.98)";
  const panelBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(12,18,42,0.10)";
  const panelShadow = isDark
    ? "0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)"
    : "0 -8px 40px rgba(12,18,42,0.14), 0 0 0 1px rgba(12,18,42,0.06)";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(12,18,42,0.07)";
  const sectionLabelColor = isDark ? "rgba(255,255,255,0.28)" : "rgba(12,18,42,0.35)";
  const rowLabelColor = isDark ? "rgba(255,255,255,0.45)" : "rgba(12,18,42,0.48)";
  const rowValueColor = isDark ? "rgba(255,255,255,0.75)" : "rgba(12,18,42,0.78)";
  const iconColor = isDark ? "rgba(255,255,255,0.38)" : "rgba(12,18,42,0.40)";
  const nameColor = isDark ? "rgba(255,255,255,0.92)" : "rgba(12,18,42,0.92)";
  const emailColor = isDark ? "rgba(255,255,255,0.40)" : "rgba(12,18,42,0.44)";
  const usageBgColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(12,18,42,0.08)";

  return (
    <div
      ref={modalRef}
      className="absolute bottom-[76px] left-0 w-[264px] z-[200] rounded-[16px] overflow-hidden animate-fadeIn"
      style={{
        background: panelBg,
        border: `1px solid ${panelBorder}`,
        boxShadow: panelShadow,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      {/* ── Profile Header ── */}
      <div className="p-4 pb-3.5" style={{ borderBottom: `1px solid ${dividerColor}` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[16px] font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #4A9EFF, #8B5CF6)" }}
          >
            {MOCK_USER.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[14px] font-semibold" style={{ color: nameColor }}>
                {MOCK_USER.name}
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[5px]"
                style={{
                  color: MOCK_USER.planColor,
                  background: `${MOCK_USER.planColor}1a`,
                  border: `1px solid ${MOCK_USER.planColor}30`,
                }}
              >
                {MOCK_USER.plan}
              </span>
            </div>
            <div className="text-[11px]" style={{ color: emailColor }}>
              {MOCK_USER.email}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="max-h-[400px] overflow-y-auto">
        {/* Account Section */}
        <SectionWrapper title="账户" dividerColor={dividerColor} sectionLabelColor={sectionLabelColor}>
          <ModalRow
            icon={<Icons.Mail size={13} />}
            label="邮箱"
            value={MOCK_USER.email}
            iconColor={iconColor}
            labelColor={rowLabelColor}
            valueColor={rowValueColor}
          />
          <ModalRow
            icon={<Icons.Key size={13} />}
            label="密码"
            value="••••••••"
            action="修改"
            iconColor={iconColor}
            labelColor={rowLabelColor}
            valueColor={rowValueColor}
          />
        </SectionWrapper>

        {/* Preferences Section */}
        <SectionWrapper title="偏好设置" dividerColor={dividerColor} sectionLabelColor={sectionLabelColor}>
          {/* Theme Toggle */}
          <div className="flex items-center justify-between py-2 px-3">
            <div className="flex items-center gap-2">
              <span style={{ color: iconColor }}>
                {isDark ? <Icons.Moon size={13} /> : <Icons.Sun size={13} />}
              </span>
              <span className="text-[12px]" style={{ color: rowLabelColor }}>
                主题
              </span>
            </div>
            <div
              className="flex items-center gap-0.5 p-0.5 rounded-[8px]"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(12,18,42,0.05)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(12,18,42,0.08)"}`,
              }}
            >
              <ThemeToggleBtn
                label="暗色"
                icon={<Icons.Moon size={11} />}
                active={isDark}
                onClick={() => setTheme("dark")}
                isDark={isDark}
              />
              <ThemeToggleBtn
                label="亮色"
                icon={<Icons.Sun size={11} />}
                active={!isDark}
                onClick={() => setTheme("light")}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between py-2 px-3">
            <div className="flex items-center gap-2">
              <span style={{ color: iconColor }}>
                <Icons.Globe size={13} />
              </span>
              <span className="text-[12px]" style={{ color: rowLabelColor }}>
                语言
              </span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="text-[11px] rounded-[6px] px-2 py-1 outline-none cursor-pointer"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(12,18,42,0.05)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(12,18,42,0.08)"}`,
                color: rowLabelColor,
              }}
            >
              <option value="简体中文">简体中文</option>
              <option value="English">English</option>
            </select>
          </div>
        </SectionWrapper>

        {/* Subscription Section */}
        <SectionWrapper title="订阅计划" dividerColor={dividerColor} sectionLabelColor={sectionLabelColor}>
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-[6px]"
                  style={{
                    color: MOCK_USER.planColor,
                    background: `${MOCK_USER.planColor}1a`,
                    border: `1px solid ${MOCK_USER.planColor}28`,
                  }}
                >
                  {MOCK_USER.plan}
                </span>
                <span className="text-[11px]" style={{ color: rowLabelColor }}>
                  企业版
                </span>
              </div>
              <button
                className="text-[10px] px-2 py-0.5 rounded-[5px] transition-colors"
                style={{
                  color: "#4A9EFF",
                  background: "rgba(74,158,255,0.1)",
                  border: "1px solid rgba(74,158,255,0.2)",
                }}
              >
                管理
              </button>
            </div>

            {/* API Usage Bar */}
            <div className="space-y-1.5">
              <div
                className="flex justify-between text-[10px]"
                style={{ color: isDark ? "rgba(255,255,255,0.38)" : "rgba(12,18,42,0.40)" }}
              >
                <span>API 用量</span>
                <span>{MOCK_USER.apiUsage}%</span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: usageBgColor }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${MOCK_USER.apiUsage}%`,
                    background: "linear-gradient(90deg, #4A9EFF, #8B5CF6)",
                  }}
                />
              </div>
              <div
                className="text-[10px]"
                style={{ color: isDark ? "rgba(255,255,255,0.28)" : "rgba(12,18,42,0.30)" }}
              >
                {MOCK_USER.apiTotal}
              </div>
            </div>
          </div>
        </SectionWrapper>

        {/* Action Links */}
        <div className="p-2" style={{ borderTop: `1px solid ${dividerColor}` }}>
          <ModalAction icon={<Icons.HelpCircle size={13} />} label="帮助与文档" isDark={isDark} />
          <ModalAction icon={<Icons.Keyboard size={13} />} label="键盘快捷键" isDark={isDark} />
          <div
            style={{
              height: 1,
              background: dividerColor,
              margin: "4px 8px",
            }}
          />
          <ModalAction icon={<Icons.LogOut size={13} />} label="退出登录" isDark={isDark} danger />
        </div>
      </div>
    </div>
  );
}

function SectionWrapper({
  title,
  children,
  dividerColor,
  sectionLabelColor,
}: {
  title: string;
  children: React.ReactNode;
  dividerColor: string;
  sectionLabelColor: string;
}) {
  return (
    <div style={{ borderBottom: `1px solid ${dividerColor}` }}>
      <div
        className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.8px]"
        style={{ color: sectionLabelColor }}
      >
        {title}
      </div>
      <div className="pb-2">{children}</div>
    </div>
  );
}

function ModalRow({
  icon,
  label,
  value,
  action,
  iconColor,
  labelColor,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  action?: string;
  iconColor: string;
  labelColor: string;
  valueColor: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-3">
      <span style={{ color: iconColor }}>{icon}</span>
      <span className="text-[11px] w-8 shrink-0" style={{ color: labelColor }}>
        {label}
      </span>
      <span className="text-[11px] flex-1 truncate" style={{ color: valueColor }}>
        {value}
      </span>
      {action && (
        <button
          className="text-[10px] px-1.5 py-0.5 rounded-[5px] shrink-0 transition-colors"
          style={{ color: "#4A9EFF", background: "rgba(74,158,255,0.1)" }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

function ModalAction({
  icon,
  label,
  isDark,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  isDark: boolean;
  danger?: boolean;
}) {
  const defaultColor = danger
    ? "#EF4444"
    : isDark
    ? "rgba(255,255,255,0.65)"
    : "rgba(12,18,42,0.65)";
  const hoverBg = danger
    ? "rgba(239,68,68,0.08)"
    : isDark
    ? "rgba(255,255,255,0.05)"
    : "rgba(12,18,42,0.05)";

  return (
    <button
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-left transition-colors"
      style={{ color: defaultColor }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <span>{icon}</span>
      <span className="text-[12px]">{label}</span>
    </button>
  );
}

function ThemeToggleBtn({
  label,
  icon,
  active,
  onClick,
  isDark,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[10px] font-medium transition-all duration-150"
      style={{
        background: active
          ? isDark
            ? "rgba(255,255,255,0.12)"
            : "rgba(255,255,255,0.85)"
          : "transparent",
        color: active
          ? isDark
            ? "rgba(255,255,255,0.92)"
            : "rgba(12,18,42,0.88)"
          : isDark
          ? "rgba(255,255,255,0.38)"
          : "rgba(12,18,42,0.40)",
        boxShadow: active
          ? isDark
            ? "inset 0 1px 0 rgba(255,255,255,0.1)"
            : "0 1px 4px rgba(12,18,42,0.10), inset 0 1px 0 rgba(255,255,255,0.8)"
          : "none",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
