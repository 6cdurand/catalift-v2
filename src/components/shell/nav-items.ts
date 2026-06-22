import {
  Home,
  Dumbbell,
  Users,
  MessageSquare,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/home", icon: Home },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: User },
];
