export type StatCard = {
    id: string;
    title: string;
    value: string;
    icon: string;
  };
  
  export const mockStats: StatCard[] = [
    {
      id: "1",
      title: "Total Topics / Skills Active",
      value: "12 Skills",
      icon: "users",
    },
    {
      id: "2",
      title: "Active Labs",
      value: "3 Labs",
      icon: "clipboard",
    },
    {
      id: "3",
      title: "Weekly Learning Hours",
      value: "12h • +18%",
      icon: "wallet",
    },
    {
      id: "4",
      title: "Completed Reflections",
      value: "6 this week",
      icon: "invoice",
    },
  ];
  