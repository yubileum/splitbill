"use client"

import React from 'react';
import { 
  PlusCircle, 
  Trash2, 
  Globe, 
  ChevronDown, 
  Percent, 
  DollarSign, 
  //Users, 
  UserPlus,
  MoreVertical,
  Split,
  Tag
} from 'lucide-react';
import { Users } from 'lucide-react';

type Currency = {
  code: string;
  symbol: string;
  name: string;
};

type Member = {
  id: number;
  name: string;
  color: string;
};

type Item = {
  id: number;
  name: string;
  price: number;
  qty: number;
  sharedQty: number;
  splits: Split[];
  discount?: {
    type: 'percentage' | 'amount';
    value: number;
  };
};

type Split = {
  memberId: number;
  quantity: number;
};

type Fee = {
  id: number;
  name: string;
  value: string;
  type: 'percentage' | 'amount';
};

const BillCalculator = () => {
  const [selectedCurrency, setSelectedCurrency] = React.useState<Currency>({ 
    code: 'IDR', 
    symbol: 'Rp', 
    name: 'Indonesian Rupiah' 
  });
  const [members, setMembers] = React.useState<Member[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);
  const [additionalFees, setAdditionalFees] = React.useState<Fee[]>([]);
  const [newMemberName, setNewMemberName] = React.useState('');
  const [newFee, setNewFee] = React.useState({ name: '', value: '', type: 'percentage' });
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = React.useState(false);
  const [itemMenuOpen, setItemMenuOpen] = React.useState(null);
  const [activePopup, setActivePopup] = React.useState({ itemId: null, type: null });
  const [tempSharedQty, setTempSharedQty] = React.useState(1);
  const [tempDiscount, setTempDiscount] = React.useState({ type: 'percentage', value: 0 });
  const lastItemRef = React.useRef(null);
  const membersRef = React.useRef(null);
  const additionalFeesRef = React.useRef(null);
  const summaryRef = React.useRef(null);

  const scrollToElement = (ref: React.RefObject<HTMLElement>): void => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  const currencies = [
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' }
  ];

  const memberColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500'
  ];

  const formatCurrency = (amount: number): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return `${selectedCurrency.symbol}0`;
    return selectedCurrency.code === 'IDR' 
      ? `${selectedCurrency.symbol} ${Math.round(amount).toLocaleString()}`
      : `${selectedCurrency.symbol}${amount.toFixed(2)}`;
  };

  const addMember = (): void => {
    if (newMemberName.trim()) {
      setMembers([...members, {
        id: Date.now(),
        name: newMemberName.trim(),
        color: memberColors[members.length % memberColors.length]
      }]);
      setNewMemberName('');
    }
  };
  
  const removeMember = (id: number): void => {
    setMembers(members.filter(member => member.id !== id));
    setItems(items.map(item => ({
      ...item,
      splits: item.splits?.filter(split => split.memberId !== id) || []
    })));
  };

  const addItem = () => {
    const newItemId = Date.now();
    setItems([
      ...items,
      {
        id: newItemId,
        name: '',
        price: 0,
        qty: 1,
        sharedQty: 1,
        splits: [],
        discount: { type: 'percentage', value: 0 }
      }
    ]);
  
    setTimeout(() => {
      if (lastItemRef.current) {
        lastItemRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 100);
  };

  const updateItem = (id: number, field: keyof Item, value: string | number): void => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = {
          ...item,
          [field]: field === 'price' || field === 'qty' ? Math.max(parseFloat(value.toString()) || 0, 0) : value
        };
        return updatedItem;
      }
      return item;
    }));
  };

  const updateItemSplit = (itemId, memberId, quantity) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        // Ensure we're working with valid numbers
        const parsedQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
        const currentSplit = item.splits?.find(s => s.memberId === memberId);
        const otherSplitsTotal = (item.splits || []).reduce((sum, s) => 
          s.memberId === memberId ? sum : sum + (Number(s.quantity) || 0), 0
        );
        
        // If item is shared, use sharedQty as max, otherwise use item.qty
        const maxAllowedQuantity = Number(item.sharedQty) > 1 
          ? Math.max(0, Number(item.sharedQty) - otherSplitsTotal)
          : Math.max(0, Number(item.qty) - otherSplitsTotal);
  
        const newQuantity = Math.min(parsedQuantity, maxAllowedQuantity);
  
        const newSplits = currentSplit
          ? (item.splits || []).map(s => s.memberId === memberId ? { ...s, quantity: newQuantity } : s)
          : [...(item.splits || []), { memberId, quantity: newQuantity }];
  
        return { ...item, splits: newSplits };
      }
      return item;
    }));
  };

  const updateItemSharedQty = (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
  
    // Number of portions to share (tempSharedQty will be 3 in your pizza example)
    const newSharedQty = Math.max(1, Math.min(
      Math.floor(Number(tempSharedQty) || 1),
      20 // Setting a reasonable maximum number of shares
    ));
    
    setItems(items.map(currentItem => {
      if (currentItem.id === itemId) {
        // Reset splits when changing share quantity
        return {
          ...currentItem,
          sharedQty: newSharedQty,
          splits: [] // Reset splits when changing number of shares
        };
      }
      return currentItem;
    }));
    setActivePopup({ itemId: null, type: null });
  };

  const handleShareClick = (item) => {
    setTempSharedQty(item.sharedQty || 1);
    setActivePopup({ itemId: item.id, type: 'share' });
    setItemMenuOpen(null);
  };

  const updateItemDiscount = (itemId) => {
    setItems(items.map(item => 
      item.id === itemId
        ? { ...item, discount: { ...tempDiscount } }
        : item
    ));
    setActivePopup({ itemId: null, type: null });
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  //Not Yet Used
  // const calculateOriginalItemTotal = (item) => {
  //   if (!item) return 0;
  //   const splitTotal = (item.splits || []).reduce((sum, split) => sum + (Number(split.quantity) || 0), 0);
  //   return splitTotal * (Number(item.price) || 0);
  // };

  const calculateItemPrice = (item: Item): number => {
    if (!item) return 0;
    const basePrice = Number(item.price) || 0;
    const discount = Number(item.discount?.value) || 0;
    
    let priceAfterDiscount = basePrice;
    if (item.discount?.type === 'percentage') {
      priceAfterDiscount = basePrice * (1 - Math.min(100, Math.max(0, discount)) / 100);
    } else {
      priceAfterDiscount = Math.max(0, basePrice - discount);
    }
  
    if (Number(item.sharedQty) > 1) {
      return priceAfterDiscount / item.sharedQty;
    }
    
    return priceAfterDiscount;
  };
  
  const calculateItemDiscountAmount = (item) => {
    if (!item || !item.discount?.value) return 0;
  
    const basePrice = Number(item.price) || 0;
    const discountValue = Number(item.discount.value) || 0;
  
    // Calculate total discount (not per quantity)
    if (item.discount.type === 'percentage') {
      return basePrice * (discountValue / 100);
    }
    return discountValue;
  };
  
  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      const totalQuantity = (item.splits || []).reduce((splitSum, split) => 
        splitSum + (Number(split.quantity) || 0), 0
      );
      
      if (Number(item.sharedQty) > 1) {
        // For shared items
        const basePrice = Number(item.price) || 0;
        const pricePerShare = basePrice / item.sharedQty;
        return sum + (pricePerShare * totalQuantity);
      } else {
        // For non-shared items
        const basePrice = Number(item.price) || 0;
        return sum + (basePrice * totalQuantity);
      }
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    
    // Calculate total discounts
    const totalDiscounts = items.reduce((sum, item) => {
      return sum + calculateItemDiscountAmount(item);
    }, 0);
  
    // Calculate additional fees
    const totalWithFees = additionalFees.reduce((total, fee) => {
      const value = parseFloat(fee.value) || 0;
      return fee.type === 'percentage'
        ? total + ((subtotal - totalDiscounts) * value / 100)
        : total + value;
    }, subtotal - totalDiscounts);
  
    return totalWithFees;
  };

  const calculateMemberShare = (memberId) => {
    let memberSubtotal = 0;
    const totalSubtotal = calculateSubtotal();
  
    // Calculate member's share of items
    items.forEach(item => {
      const split = item.splits.find(s => s.memberId === memberId);
      if (split?.quantity > 0) {
        if (Number(item.sharedQty) > 1) {
          // For shared items
          const basePrice = Number(item.price) || 0;
          const discount = Number(item.discount?.value) || 0;
          let priceAfterDiscount = basePrice;
  
          // Apply discount to total price first
          if (item.discount?.type === 'percentage') {
            priceAfterDiscount = basePrice * (1 - Math.min(100, Math.max(0, discount)) / 100);
          } else {
            priceAfterDiscount = Math.max(0, basePrice - discount);
          }
  
          // Then divide by shares and multiply by quantity
          const pricePerShare = priceAfterDiscount / item.sharedQty;
          memberSubtotal += pricePerShare * split.quantity;
        } else {
          // For non-shared items
          const basePrice = Number(item.price) || 0;
          const discount = Number(item.discount?.value) || 0;
          let priceAfterDiscount = basePrice;
  
          // Apply discount to total price
          if (item.discount?.type === 'percentage') {
            priceAfterDiscount = basePrice * (1 - Math.min(100, Math.max(0, discount)) / 100);
          } else {
            priceAfterDiscount = Math.max(0, basePrice - discount);
          }
  
          memberSubtotal += priceAfterDiscount * split.quantity;
        }
      }
    });
  
    let totalAfterFees = memberSubtotal;
  
    // Calculate additional fees (tax, service charge)
    if (memberSubtotal > 0 && totalSubtotal > 0) {
      additionalFees.forEach(fee => {
        const feeValue = parseFloat(fee.value) || 0;
        if (fee.type === 'percentage') {
          // Calculate percentage fee based on proportion of subtotal
          const memberProportion = memberSubtotal / totalSubtotal;
          totalAfterFees += (totalSubtotal * (feeValue / 100)) * memberProportion;
        } else {
          // Split fixed fees equally
          totalAfterFees += feeValue / members.length;
        }
      });
    }
  
    return totalAfterFees;
  };

  const addFee = () => {
    if (newFee.name && newFee.value) {
      setAdditionalFees([...additionalFees, { ...newFee, id: Date.now() }]);
      setNewFee({ name: '', value: '', type: 'percentage' });
      
      setTimeout(() => scrollToElement(additionalFeesRef), 100);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.currency-dropdown')) {
        setIsCurrencyDropdownOpen(false);
      }
      if (!event.target.closest('.item-menu') && !event.target.closest('.item-menu-trigger')) {
        setItemMenuOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-2 sm:p-4 md:p-8 text-white">
      <div className="sticky top-0 z-50 mb-4 flex justify-end">
        <div className="relative currency-dropdown">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur rounded-lg hover:bg-gray-700/80"
            onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
          >
            <Globe size={16} />
            {selectedCurrency.code}
            <ChevronDown size={16} />
          </button>
          
          {isCurrencyDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 rounded-lg shadow-xl z-50">
              {currencies.map(currency => (
                <button
                  key={currency.code}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700/50"
                  onClick={() => {
                    setSelectedCurrency(currency);
                    setIsCurrencyDropdownOpen(false);
                  }}
                >
                  {currency.name} ({currency.symbol})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Split Bill Calculator</h1>
          <p className="text-gray-400">Simple and accurate bill splitting</p>
        </div>

        {/* Members Section */}
        <div ref={membersRef} className="bg-gray-800/50 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-semibold">Members</h2>
          <div className="flex gap-2 w-full">
            <input
              type="text"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addMember()}
              placeholder="Add member name"
              className="flex-1 bg-gray-700/50 rounded-lg px-3 py-2 text-sm sm:text-base min-w-0"
            />
            <button
              onClick={addMember}
              className="p-2 text-blue-400 hover:text-blue-300"
            >
              <UserPlus size={20} />
            </button>
          </div>
        </div>

          <div className="flex flex-wrap gap-2">
            {members.map(member => (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/30"
              >
                <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center`}>
                  {member.name[0].toUpperCase()}
                </div>
                <span>{member.name}</span>
                <button
                  onClick={() => removeMember(member.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-gray-800/50 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Items</h2>
            <button
              onClick={addItem}
              disabled={members.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle size={16} />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              ref={index === items.length - 1 ? lastItemRef : null}
              className="space-y-3 bg-gray-700/30 p-4 rounded-lg relative"
            >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    className="flex-1 bg-gray-700/50 rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base min-w-0"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.qty || ''}
                    onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                    min="1"
                    className="w-14 sm:w-20 bg-gray-700/50 rounded-lg px-1 sm:px-2 py-2 text-sm sm:text-base"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.price || ''}
                    onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                    min="0"
                    className="w-20 sm:w-24 bg-gray-700/50 rounded-lg px-1 sm:px-2 py-2 text-sm sm:text-base"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 sm:p-2 text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="relative item-menu">
                    <button
                      onClick={() => setItemMenuOpen(itemMenuOpen === item.id ? null : item.id)}
                      className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-300 item-menu-trigger"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {itemMenuOpen === item.id && (
                      <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 rounded-lg shadow-xl z-10">
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-gray-700/50 flex items-center gap-2"
                          onClick={() => handleShareClick(item)}
                        >
                          <Split size={16} />
                          Share Item
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-gray-700/50 flex items-center gap-2"
                          onClick={() => {
                            setTempDiscount(item.discount);
                            setActivePopup({ itemId: item.id, type: 'discount' });
                            setItemMenuOpen(null);
                          }}
                        >
                          <Tag size={16} />
                          Add Discount
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Display shared quantity and discount if applied */}
                {(Number(item.sharedQty) > 1 || Number(item.discount?.value) > 0) && (
                  <div className="flex flex-col gap-1 text-sm text-gray-400 mt-1 bg-gray-700/20 p-2 rounded-lg">
                    {Number(item.sharedQty) > 1 && (
                      <div className="flex justify-between">
                        <span>Shared between {item.sharedQty} people</span>
                        <span>{formatCurrency((Number(item.price) || 0) / item.sharedQty)} per share</span>
                      </div>
                    )}
                    {Number(item.discount?.value) > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>Original price:</span>
                          <span>{formatCurrency(Number(item.price) || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Discount ({item.discount?.type === 'percentage' 
                            ? `${Number(item.discount.value).toFixed(0)}%` 
                            : formatCurrency(Number(item.discount.value) || 0)}):</span>
                          <span>-{formatCurrency(
                            item.discount?.type === 'percentage' 
                              ? ((Number(item.price) || 0) * (Math.min(100, Math.max(0, Number(item.discount.value))) / 100))
                              : Math.min(Number(item.price) || 0, Number(item.discount.value) || 0)
                          )}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Final price:</span>
                          <span>{formatCurrency(calculateItemPrice(item))}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Members Section for Splitting */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map(member => {
                    const split = item.splits.find(s => s.memberId === member.id) || { quantity: 0 };
                    return (
                      <div key={member.id} className="flex items-center gap-2 bg-gray-700/20 p-2 rounded-lg">
                        <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center`}>
                          {member.name[0].toUpperCase()}
                        </div>
                        <span className="flex-grow text-sm sm:text-base">{member.name}</span>
                        <input
                          type="number"
                          value={Number(split.quantity) || ''}
                          onChange={(e) => updateItemSplit(item.id, member.id, e.target.value)}
                          className="w-16 sm:w-20 bg-gray-700/50 rounded-lg px-2 sm:px-3 py-1 text-sm sm:text-base"
                          placeholder="0"
                          min="0"
                          max={Number(item.sharedQty) > 1 ? item.sharedQty : item.qty}
                          step="1"
                          onWheel={(e) => e.target.blur()}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Safe Share PopUp */}
                  {activePopup.itemId === item.id && activePopup.type === 'share' && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-gray-800 p-4 sm:p-6 rounded-xl w-full max-w-sm sm:w-96 space-y-4">
                        <h3 className="text-lg font-semibold">Share {item.name}</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-1">Number of people sharing:</label>
                            <input
                              type="number"
                              min="1"
                              max={20}
                              value={tempSharedQty}
                              onChange={(e) => {
                                const inputValue = parseInt(e.target.value) || 1;
                                setTempSharedQty(Math.min(Math.max(1, inputValue), 20));
                              }}
                              className="w-full bg-gray-700/50 rounded-lg px-3 py-2"
                              onWheel={(e) => e.target.blur()}
                              onKeyDown={(e) => {
                                if (e.key === '-' || e.key === 'e' || e.key === '.') {
                                  e.preventDefault();
                                }
                              }}
                            />
                          </div>

                          <div className="text-sm bg-gray-700/20 p-3 rounded-lg space-y-2">
                            <div className="flex justify-between">
                              <span>Total item price:</span>
                              <span>{formatCurrency(Number(item.price) || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Price per share:</span>
                              <span>{formatCurrency((Number(item.price) || 0) / tempSharedQty)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                            onClick={() => setActivePopup({ itemId: null, type: null })}
                          >
                            Cancel
                          </button>
                          <button
                            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                            onClick={() => updateItemSharedQty(item.id)}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Share Popup
                {activePopup.itemId === item.id && activePopup.type === 'share' && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-xl w-96 space-y-4">
                      <h3 className="text-lg font-semibold">Share Item</h3>
                      <div className="space-y-2">
                        <label className="block text-sm text-gray-400">Split into portions:</label>
                        <input
                          type="number"
                          min="1"
                          max={item.qty}
                          value={tempSharedQty}
                          onChange={(e) => setTempSharedQty(Math.max(1, Math.min(parseInt(e.target.value) || 1, item.qty)))}
                          className="w-full bg-gray-700/50 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                          onClick={() => setActivePopup({ itemId: null, type: null })}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                          onClick={() => updateItemSharedQty(item.id)}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )} */}

                {/* Discount Popup */}
                {activePopup.itemId === item.id && activePopup.type === 'discount' && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-gray-800 p-4 sm:p-6 rounded-xl w-full max-w-sm sm:w-96 space-y-4">
                      <h3 className="text-lg font-semibold">Add Discount</h3>
                      <div className="space-y-4">
                        <div className="flex bg-gray-700/50 rounded-lg p-1">
                          <button
                            onClick={() => setTempDiscount({ ...tempDiscount, type: 'percentage' })}
                            className={`flex-1 px-3 py-1 rounded flex items-center justify-center gap-1 ${
                              tempDiscount.type === 'percentage' ? 'bg-blue-600' : ''
                            }`}
                          >
                            <Percent size={16} /> Percentage
                          </button>
                          <button
                            onClick={() => setTempDiscount({ ...tempDiscount, type: 'amount' })}
                            className={`flex-1 px-3 py-1 rounded flex items-center justify-center gap-1 ${
                              tempDiscount.type === 'amount' ? 'bg-blue-600' : ''
                            }`}
                          >
                            <DollarSign size={16} /> Amount
                          </button>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={tempDiscount.type === 'percentage' ? 100 : undefined}
                          value={tempDiscount.value}
                          onChange={(e) => setTempDiscount({ 
                            ...tempDiscount, 
                            value: Math.max(0, tempDiscount.type === 'percentage' ? Math.min(100, parseFloat(e.target.value) || 0) : parseFloat(e.target.value) || 0)
                          })}
                          className="w-full bg-gray-700/50 rounded-lg px-3 py-2"
                          placeholder={tempDiscount.type === 'percentage' ? 'Percentage' : 'Amount'}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                          onClick={() => setActivePopup({ itemId: null, type: null })}
                        >
                          Cancel
                        </button>
                        <button
                          className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                          onClick={() => updateItemDiscount(item.id)}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Additional Fees Section */}
        <div ref={additionalFeesRef} className="bg-gray-800/50 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Additional Fees</h2>
          
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Fee name"
              value={newFee.name}
              onChange={(e) => setNewFee({ ...newFee, name: e.target.value })}
              className="flex-1 bg-gray-700/50 rounded-lg px-2 sm:px-3 py-2 text-sm sm:text-base min-w-0"
            />
            <input
              type="number"
              placeholder="Value"
              value={newFee.value}
              onChange={(e) => setNewFee({ ...newFee, value: e.target.value })}
              className="w-20 sm:w-24 bg-gray-700/50 rounded-lg px-2 py-2 text-sm sm:text-base"
            />
            <div className="flex bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setNewFee({ ...newFee, type: 'percentage' })}
                className={`w-8 h-8 rounded flex items-center justify-center ${newFee.type === 'percentage' ? 'bg-blue-600' : ''}`}
              >
                <Percent size={16} />
              </button>
              <button
                onClick={() => setNewFee({ ...newFee, type: 'amount' })}
                className={`w-8 h-8 rounded flex items-center justify-center ${newFee.type === 'amount' ? 'bg-blue-600' : ''}`}
              >
                <DollarSign size={16} />
              </button>
            </div>
            <button
              onClick={addFee}
              className="p-1.5 sm:p-2 text-blue-400 hover:text-blue-300"
            >
              <PlusCircle size={20} />
            </button>
          </div>

          <div className="space-y-2">
            {additionalFees.map(fee => (
              <div key={fee.id} className="flex justify-between items-center bg-gray-700/30 rounded-lg px-4 py-2">
                <span>{fee.name}</span>
                <div className="flex items-center gap-4">
                  <span>
                    {fee.type === 'percentage' 
                      ? `${fee.value}%` 
                      : formatCurrency(parseFloat(fee.value))}
                  </span>
                  <button
                    onClick={() => setAdditionalFees(additionalFees.filter(f => f.id !== fee.id))}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Section */}
        <div ref={summaryRef} className="bg-gray-800/50 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-semibold">Summary</h2>
          {/* <div className="space-y-2 border-t border-gray-700 pt-2 mb-4">
            <h3 className="font-semibold text-sm text-gray-400">Discounts Applied</h3>
            {items
              .filter(item => Number(item.discount?.value) > 0)
              .map(item => {
                const discountAmount = calculateItemDiscountAmount(item);
                return discountAmount > 0 ? (
                  <div key={item.id} className="flex justify-between text-sm text-gray-400">
                    <span>{item.name || 'Unnamed item'} discount:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                ) : null;
              })}
          </div> */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            {/* Discounts */}
            {items.some(item => Number(item.discount?.value) > 0) && (
              <div className="space-y-2">
                {items
                  .filter(item => Number(item.discount?.value) > 0)
                  .map(item => {
                    const discountAmount = calculateItemDiscountAmount(item);
                    return discountAmount > 0 ? (
                      <div key={item.id} className="flex justify-between text-sm text-gray-400">
                        <span>{item.name || 'Unnamed item'} discount:</span>
                        <span className="text-red-400">-{formatCurrency(discountAmount)}</span>
                      </div>
                    ) : null;
                  })}
                <div className="flex justify-between font-medium">
                  <span>Subtotal after discounts:</span>
                  <span>{formatCurrency(calculateSubtotal() - items.reduce((sum, item) => 
                    sum + calculateItemDiscountAmount(item), 0
                  ))}</span>
                </div>
              </div>
            )}
            {/* Additional Fees */}
            {additionalFees.map(fee => (
              <div key={fee.id} className="flex justify-between text-gray-400">
                <span>{fee.name}:</span>
                <span>+{formatCurrency(
                  fee.type === 'percentage' 
                    ? (calculateSubtotal() - items.reduce((sum, item) => 
                        sum + calculateItemDiscountAmount(item), 0
                      )) * parseFloat(fee.value) / 100
                    : parseFloat(fee.value)
                )}</span>
              </div>
            ))}
            {/* Total */}
            <div className="flex justify-between text-xl font-bold pt-4 border-t border-gray-700">
              <span>Total:</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          {members.length > 0 && (
            <div className="pt-4 space-y-2 border-t border-gray-700">
              <h3 className="font-semibold text-base sm:text-lg">Individual Shares</h3>
              {members.map(member => {
                const share = calculateMemberShare(member.id);
                return (
                  <div key={member.id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${member.color} flex items-center justify-center`}>
                        {member.name[0].toUpperCase()}
                      </div>
                      <span>{member.name}</span>
                    </div>
                    <span>{formatCurrency(share)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-gray-700">
            <div className="flex justify-between items-center text-sm text-gray-400">
              <span>Total of individual shares:</span>
              <span>{formatCurrency(members.reduce((sum, member) => 
                sum + calculateMemberShare(member.id), 0
              ))}</span>
            </div>
            {Math.abs(calculateTotal() - members.reduce((sum, member) => sum + calculateMemberShare(member.id), 0)) > 0.01 && (
              <div className="flex justify-between items-center text-sm text-red-400 mt-1">
                <span>Difference from total:</span>
                <span>{formatCurrency(Math.abs(
                  calculateTotal() - members.reduce((sum, member) => sum + calculateMemberShare(member.id), 0)
                ))}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillCalculator;
