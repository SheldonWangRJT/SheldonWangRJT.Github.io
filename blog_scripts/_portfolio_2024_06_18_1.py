rate = 1.08

def inv_first_10_year(x, y):
    for i in range(0, 65-20):
        if i < 10:
            x = (x + 3600) * rate
            y.append(int(x))
        else:
            x = x * rate
            y.append(int(x))
    print(y)
    print(len(y))
    print(y[-1])

def inv_rest_years(x, y):
    for i in range(0, 65-20):
        if i < 10:
            x = 0
            y.append(int(x))    
        else:
            x = (x + 3600) * rate
            y.append(int(x))
    print(y)
    print(len(y))
    print(y[-1])

x = 0
y = []
inv_first_10_year(x, y)

x = 0
y = []
inv_rest_years(x, y)