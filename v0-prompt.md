# MLBB Skin Management System - v0 Prompt

I want you to build a **responsive web application UI** for an **MLBB Skin Management System**. This system is used to manage skin gifting orders for the game Mobile Legends: Bang Bang.

## **Tech Stack**
*   **Framework**: Next.js (App Router)
*   **Styling**: Tailwind CSS
*   **Components**: Shadcn UI (Card, Table, Button, Badge, Input, Form, Dialog, DropdownMenu)
*   **Icons**: Lucide React

## **Visual Style**
*   **Theme**: Clean, professional dashboard aesthetic. Use a color palette with Emerald/Teal greens (primary), slate grays (text), and crisp white backgrounds.
*   **Layout**: Sidebar navigation for desktop, bottom navigation or hamburger menu for mobile.
*   **Responsive**: Mobile-first design.
    *   **Grids**: Dashboard cards should stack 1 column on mobile -> 2 on tablet -> 4 on desktop.
    *   **Tables**: Must use horizontal scrolling (`overflow-x-auto`) on mobile to preserve data density. Do not hide columns; allow scrolling.

## **Key Screens to Generate**

### **1. Login Screen**
*   Centered card layout.
*   Fields: Email, Password.
*   "Sign In" button.
*   Clean background (perhaps a subtle gradient).

### **2. Admin Dashboard (Main View)**
*   **KPI Cards (Top)**:
    *   "Active Suppliers" (Count)
    *   "Recent Orders" (Count)
    *   "Low Balance" (Count, yellow warning color)
    *   "Critical Balance" (Count, red danger color)
*   **Supplier Balances Table**:
    *   Columns: Supplier Name, Email, Balance (highlighted), Threshold, Status Badge (Healthy/Low/Critical).
*   **Recent Orders Table**:
    *   Columns: Skin Name, MLBB ID, IGN, Supplier, Price, Status Badge, Created Date.

### **3. Admin Orders Page**
*   **Filters**: Grid layout inputs for Search (IGN/ID), Status (Dropdown), Supplier (Dropdown).
*   **Orders Table**: Detailed list of orders with actions (Edit, Delete).

### **4. Supplier Dashboard (Main View)**
*   **Balance Card**: Large display of "Current Diamond Balance" with an "Add Balance" input and button.
*   **Stats**: "Active Orders" count.
*   **Active Orders Table**:
    *   List of assigned orders.
    *   **Action Buttons**: "Follow" (for new orders), "Ready" (after 7 days), "Sent" (to complete).
    *   **Status Badges**: Pending (Gray), Followed (Blue), Ready (Green).
*   **Order History**: Separate section for Completed/Failed orders.

## **Specific UI Behaviors**
*   **Status Badges**:
    *   `PENDING`: Gray/Secondary
    *   `FOLLOWED`: Blue/Info
    *   `READY_FOR_GIFTING`: Green/Success
    *   `COMPLETED`: Dark Green
    *   `FAILED`: Red/Destructive
*   **Health Indicators**:
    *   Balance > Threshold: Green text/badge.
    *   Balance < Threshold: Yellow text/badge.
    *   Balance < 50% Threshold: Red text/badge.

Generate the main **Admin Dashboard** view first, showcasing the responsive grid and the data tables.
