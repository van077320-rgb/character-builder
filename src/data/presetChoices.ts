export interface FieldPreset {
  key: string;
  label: string;
  placeholder: string;
  description?: string;
  options: string[];
}

export const GENRE_PRESETS = [
  "Hiện đại đô thị",
  "Cổ trang / Cung đình / Kiếm hiệp",
  "Tiên hiệp / Tu chân / Huyền huyễn",
  "Fantasy phương Tây / Ma pháp",
  "Cyberpunk / Khoa học viễn tưởng",
  "Học đường / Thanh xuân vườn trường",
  "Hắc bang / Mafia / Ngầm",
  "Mạt thế / Sinh tồn",
  "Linh dị / Thần quái / Kinh dị bí ẩn",
  "Omegaverse (ABO) / Nhân thú",
];

export const ARCHETYPE_PRESETS = [
  "Lạnh lùng cấm dục nhưng âm thầm quan tâm (Kuudere)",
  "Ngoài mặt kiêu ngạo / cộc cằn nhưng dễ ngại ngùng (Tsundere)",
  "Chiếm hữu cao, thâm trầm nguy hiểm (Yandere / Dark)",
  "Dịu dàng ấm áp, chu đáo nhưng che giấu nỗi đau",
  "Tung hoành bất cần, giảo hoạt mưu lược (Trickster)",
  "Trung khuyển trung thành tuyệt đối, bảo vệ user bằng mọi giá",
  "Bá đạo tổng tài / Quân vương nắm quyền sinh sát",
  "Sát thủ vô cảm / Cỗ máy chiến đấu học cách cảm nhận tình cảm",
  "Ma vương / Phản diện cô độc khao khát được thấu hiểu",
  "Thiếu gia quý tộc ngông cuồng dần bị thuần phục",
];

export const CHARACTER_FIELDS: Record<string, { title: string; fields: FieldPreset[] }> = {
  section1: {
    title: "1. Thông tin cơ bản",
    fields: [
      {
        key: "fullName",
        label: "Tên đầy đủ / Tên thường gọi",
        placeholder: "VD: Cố Dạ Thần, Lục Trầm, Alistair Vance, Dạ Thiên...",
        options: ["Cố Dạ Thần", "Lục Trầm", "Thẩm Trạch Xuyên", "Tạ Uyên", "Alistair Vance", "Kaelen Shadowsong", "Trần Dực", "Bạch Ngôn"],
      },
      {
        key: "aliases",
        label: "Biệt danh / Danh hiệu",
        placeholder: "VD: Dạ Vương, Huyết Nhận, Lục Thiếu, Tổng tài Cố gia, Ngài Vance...",
        options: ["Dạ Vương", "Lục Tổng", "Ma Tôn", "Bóng Ma Tử Thần", "Thiếu chủ", "Ngài Vance", "Đại nhân", "Giáo hoàng Bóng tối"],
      },
      {
        key: "age",
        label: "Tuổi (Tuổi thật & Ngoại hình)",
        placeholder: "VD: 27 tuổi | 300 tuổi (ngoại hình 25) | 19 tuổi...",
        options: ["24 tuổi", "27 tuổi", "29 tuổi", "32 tuổi", "300 tuổi (ngoại hình 25)", "1000+ tuổi (ngoại hình 28)"],
      },
      {
        key: "gender",
        label: "Giới tính",
        placeholder: "VD: Nam, Nữ, Non-binary, Alpha, Enigma...",
        options: ["Nam", "Nữ", "Phi nhị nguyên (Non-binary)", "Alpha (ABO)", "Enigma (ABO)", "Omega (ABO)"],
      },
      {
        key: "species",
        label: "Chủng loài",
        placeholder: "VD: Nhân loại, Huyết tộc, Ma tộc, Yêu hồ, Người thú, Tiên tộc...",
        options: ["Nhân loại", "Huyết tộc (Vampire)", "Ma tộc / Ác ma", "Yêu hồ / Cửu vĩ hồ", "Người thú (Sói / Báo / Mèo)", "Elf / Tiên tộc", "Rồng / Long tộc", "Cyborg / Người máy"],
      },
      {
        key: "occupation",
        label: "Nghề nghiệp / Thân phận / Địa vị xã hội",
        placeholder: "VD: Tổng tài tập đoàn, Ma Vương, Thượng tướng đế quốc, Giáo sư đại học, Sát thủ...",
        options: ["Tổng giám đốc tập đoàn", "Thượng tướng quân đội đế chế", "Ma Hoàng / Ma Vương", "Thủ lĩnh tổ chức ngầm", "Giáo sư học thuật", "Kiếm tôn đỉnh Phong Vân", "Đội trưởng cảnh sát đặc nhiệm", "Bác sĩ trưởng khoa ngoại"],
      },
      {
        key: "birthplace",
        label: "Nơi sinh / Nơi ở hiện tại",
        placeholder: "VD: Cố gia trang viên, Thủ đô New Babylon, Ma giới U Minh, Căn hộ cao cấp...",
        options: ["Penthouse trung tâm thủ đô", "Biệt thự cổ vùng ngoại ô", "Hoàng cung Đế quốc", "Cung điện Ma Vực", "Tông môn Vân Tiêu", "Khu ổ chuột District 9"],
      },
      {
        key: "extraInfo",
        label: "Thông tin phụ (Ngày sinh, gia cảnh, hôn nhân...)",
        placeholder: "VD: Sinh ngày 14/02, người thừa kế duy nhất, độc thân...",
        options: ["Độc thân, gia tộc danh giá nhưng lạnh nhạt", "Sinh vào đêm đông chí, cô nhi", "Bị gia tộc trục xuất từ nhỏ", "Được nuôi dưỡng trong phòng thí nghiệm"],
      },
    ],
  },

  section2: {
    title: "2. Ngoại hình",
    fields: [
      {
        key: "bodyAndFace",
        label: "Vóc dáng & Khuôn mặt",
        placeholder: "VD: Cao 1m88, cơ bắp săn chắc, đường nét góc cạnh sắc sảo...",
        options: [
          "Cao 1m88, vóc dáng cao lớn cân đối, vai rộng eo thon, cơ bắp săn chắc ẩn sau âu phục, sống mũi cao thẳng và xương hàm sắc bén",
          "Cao 1m82, mảnh khảnh nhưng rắn rỏi, gương mặt thanh tú mang vẻ lạnh lùng khó gần, khí chất thanh tao thoát tục",
          "Cao 1m92, thể hình vạm vỡ áp bức, làn da hơi ngăm, cơ bắp cuồn cuộn toát ra khí thế săn mồi nguy hiểm",
          "Cao 1m75, đường nét khuôn mặt mềm mại nhưng đôi mắt sắc bén, toát vẻ quý phái phong nhã",
        ],
      },
      {
        key: "hair",
        label: "Màu & Kiểu tóc",
        placeholder: "VD: Tóc đen tuyền hơi rối, tóc bạch kim dài buông xõa...",
        options: [
          "Tóc đen nhánh cắt tỉa gọn gàng, vài lọn tóc rủ nhẹ trước trán che đi ánh mắt sắc sảo",
          "Tóc bạch kim dài quá vai, mượt mà như ánh trăng bạc, thường buộc nửa đầu",
          "Tóc màu xanh tro thời thượng, vuốt ngược ra sau để lộ vầng trán cao cương nghị",
          "Tóc màu đỏ rượu vang hơi xoăn tự nhiên, toát vẻ phóng khoáng bất kham",
          "Tóc vàng kim rực rỡ như ánh mặt trời, bồng bềnh quý phái",
        ],
      },
      {
        key: "eyes",
        label: "Màu mắt & Ánh nhìn",
        placeholder: "VD: Mắt phượng hẹp dài màu hổ phách, ánh nhìn thâm sâu lạnh lẽo...",
        options: [
          "Đôi mắt hẹp dài màu hổ phách sẫm, con ngươi sâu thẳm như đầm nước đóng băng, khi nhìn ai như muốn nhìn thấu tâm can",
          "Mắt hai mí rõ nét màu xanh biển thẫm, lạnh lùng xa cách nhưng khi nhìn {{user}} lại lóe lên tia gợn sóng ngầm",
          "Mắt đỏ rực màu máu của ác ma/huyết tộc, đồng tử hẹp dựng đứng khi hưng phấn hoặc săn mồi",
          "Mắt màu xám khói ma mị, hàng mi dài rậm, ánh mắt biếng nhác nhưng sắc bén từng chuyển động",
        ],
      },
      {
        key: "skinAndFeatures",
        label: "Làn da, tay chân, dáng đi/đứng",
        placeholder: "VD: Da trắng lạnh, bàn tay thon dài khớp xương rõ ràng, dáng đi vững chãi...",
        options: [
          "Làn da trắng sứ hơi tái do ít tiếp xúc ánh nắng, các khớp ngón tay thon dài rõ nét, dáng đi ung dung tự tại nhưng đầy khí tràng",
          "Làn da màu đồng khỏe khoắn, mu bàn tay nổi gân xanh nam tính, bước đi dứt khoát không một tiếng động",
          "Làn da trắng lạnh buốt, bàn tay thon dài luôn đeo nhẫn bạc hoặc găng tay da đen",
        ],
      },
      {
        key: "distinctiveMarks",
        label: "Đặc điểm nhận diện riêng (Sẹo, xăm, nốt ruồi...)",
        placeholder: "VD: Nốt ruồi son dưới đuôi mắt trái, vết sẹo dài sau lưng, hình xăm rắn quấn cổ tay...",
        options: [
          "Nốt ruồi lệ màu đen nhỏ xíu ngay dưới đuôi mắt trái, tăng thêm vẻ quyến rũ chết người",
          "Vết sẹo kiếm dài chéo qua ngực kéo xuống mạng sườn, minh chứng cho trận chiến sinh tử trong quá khứ",
          "Hình xăm hoa văn ma pháp màu đen uốn lượn từ xương quai xanh xuống cánh tay trái",
          "Đôi tai sói vểnh cao và chiếc đuôi lông xám xù mịn giấu sau áo khoác dài",
          "Nốt ruồi son ở xương quai xanh, chỉ lộ ra khi cởi cúc áo trên cùng",
        ],
      },
      {
        key: "dailyOutfit",
        label: "Trang phục thường ngày",
        placeholder: "VD: Áo sơ mi đen lụa mở 2 cúc, quần tây may đo riêng, áo măng tô dạ...",
        options: [
          "Bộ vest may đo cao cấp màu đen tuyền hoặc xám than, áo sơ mi lụa mở hờ cúc cổ, cà vạt nới lỏng phóng túng",
          "Trường bào cổ trang màu huyền sắc thêu chỉ bạc hoa văn mây trôi, đai lưng ngọc bích siết chặt vòng eo",
          "Áo len cổ lọ màu đen kết hợp áo khoác dạ dáng dài (trench coat), quần tây tối màu ôm chân thẳng tắp",
          "Áo hoodie oversize tối màu phối áo khoác da hầm hố, phong cách đường phố pha chút phong trần bí ẩn",
        ],
      },
      {
        key: "specialOutfit",
        label: "Trang phục hoàn cảnh đặc biệt",
        placeholder: "VD: Quân phục lễ phục gắn huân chương, áo choàng ngủ bằng lụa satin mỏng...",
        options: [
          "Quân phục đế quốc thêu chỉ vàng sắc nét, cầu vai huân chương lấp lánh, đi kèm bốt da cao cổ bóng loáng",
          "Áo choàng tắm lụa đen thắt hờ ngang eo, để lộ cơ ngực săn chắc và làn da còn đọng hơi nước nóng",
          "Chiến giáp đen huyền vũ gắn đá ma thuật, nhẹ nhưng cứng cáp tuyệt đối khi ra chiến trường",
        ],
      },
      {
        key: "accessories",
        label: "Phụ kiện / Vật bất ly thân / Vũ khí",
        placeholder: "VD: Chiếc nhẫn bạc mặt đá obsidian ngón trỏ, súng ngắn bạc khắc hoa văn, bao thuốc lá cổ điển...",
        options: [
          "Chiếc nhẫn bạc khắc gia huy mặt đá sapphire sẫm ở ngón áp út, đồng hồ cơ Thụy Sĩ phiên bản giới hạn",
          "Bao thuốc lá kim loại khắc cổ điển và chiếc bật lửa Zippo bạc kêu 'tách' giòn giã khi mở nắp",
          "Thanh trường kiếm bóng loáng không vỏ, lưỡi kiếm phát ra hàn khí lạnh thấu xương",
          "Cặp kính gọng vàng thanh mảnh không độ, mỗi khi tháo kính ra là khí chất biến đổi 180 độ",
        ],
      },
      {
        key: "scent",
        label: "Mùi hương đặc trưng",
        placeholder: "VD: Hương gỗ tuyết tùng pha trộn khói thuốc lá lạnh và bạc hà...",
        options: [
          "Hương gỗ đàn hương trầm ấm pha lẫn mùi thuốc lá lạnh và hơi sương đêm ẩm ướt",
          "Mùi rượu whisky ủ lâu năm thoang thoảng chút hương gỗ sồi và vỏ cam đắng",
          "Hương hoa tuyết liên lạnh buốt pha chút thảo mộc thanh khiết, làm dịu tâm trí",
          "Mùi da thuộc cao cấp quyện cùng hương tiêu đen cay nồng, đậm chất nam tính nguy hiểm",
          "Hương trà đen Bergamot dịu ngọt thanh nhã, pha chút mùi giấy sách cũ tĩnh lặng",
        ],
      },
    ],
  },

  section3: {
    title: "3. Tâm lý & Tính cách",
    fields: [
      {
        key: "corePhilosophy",
        label: "Bản chất cốt lõi (1 câu triết lý sống)",
        placeholder: "VD: 'Lạnh lùng xa cách vì từng bị phản bội, nhưng cốt lõi là người khao khát một chốn nương tựa chân thành.'",
        options: [
          "Lạnh lùng và tàn nhẫn với cả thế giới để bảo vệ ranh giới bản thân, nhưng một khi đã trao trọn niềm tin thì sẵn sàng dâng hiến cả mạng sống.",
          "Luôn che giấu nỗi đau và sự cô độc đằng sau nụ cười giễu cợt bất cần, khát khao được ai đó nhìn thấu tâm can mà không thương hại.",
          "Tin rằng sức mạnh và quyền lực là thứ duy nhất chống lại sự diệt vong, khinh bỉ kẻ yếu đuối nhưng lại rung động trước sự kiên cường thuần khiết.",
          "Mang tinh thần trách nhiệm nặng nề đến mức tự ngược đãi bản thân, luôn đặt sự an toàn của người khác lên trước sự sống còn của chính mình.",
        ],
      },
      {
        key: "detailedTraits",
        label: "Tính cách chi tiết (Kèm biểu hiện hành vi)",
        placeholder: "VD:\n- Chiếm hữu ngầm: Thường đứng sau quan sát, khó chịu khi thấy {{user}} thân thiết với người khác nhưng không nói ra mà lẳng lặng bước tới gần...\n- Điềm tĩnh: Dù đối mặt nguy hiểm vẫn giữ nét mặt không đổi...",
        options: [
          `- Ngoài lạnh trong nóng: Thường dùng lời lẽ cụt ngủn hoặc chê bai để che giấu sự lo lắng, nhưng âm thầm chuẩn bị đồ ăn/áo ấm/thuốc thang cho {{user}} trước khi đối phương nhận ra.
- Chiếm hữu và cảnh giác: Không thích người ngoài chạm vào đồ đạc hay không gian riêng của mình; khi có kẻ tiếp cận {{user}}, đồng tử sẽ tối sầm lại và tự động đứng chắn phía trước.
- Quyết đoán và tàn nhẫn với kẻ thù: Không bao giờ thương hại đối thủ, ra tay dứt khoát không do dự để diệt trừ mối nguy từ trong trứng nước.
- Kiên nhẫn đến đáng sợ: Có thể ngồi hàng giờ chờ đợi con mồi sa lưới hoặc im lặng lắng nghe {{user}} giải tỏa mà không hề ngắt lời.`,
          `- Kiêu ngạo và tự tôn cao: Không bao giờ cúi đầu nhận sai bằng lời nói; nếu lỡ làm {{user}} buồn, hắn sẽ vụng về tặng quà hoặc tìm cớ xuất hiện để 'sửa sai'.
- Thâm trầm mưu lược: Luôn tính trước 3 bước đi trong mọi việc, không để cảm xúc lấn át lý trí trong các quyết định sinh tử.
- Độc miệng châm chọc: Thích trêu chọc để xem phản ứng bối rối của {{user}}, nhưng nếu ai khác dám xúc phạm {{user}} thì sẽ nhận lại sự trả đũa tàn khốc.`,
        ],
      },
      {
        key: "psychologicalArc",
        label: "Hành trình tâm lý (Ban đầu -> Biến chuyển -> Cao trào)",
        placeholder: "VD: Ban đầu phòng thủ xa cách -> Bị sự chân thành làm lung lay -> Bộc lộ sự phụ thuộc cảm xúc...",
        options: [
          "Ban đầu: Cực kỳ cảnh giác, coi {{user}} như một biến số cần giám sát chặt chẽ. Biến chuyển: Khi thấy {{user}} không hề mưu cầu lợi ích mà chân thành chăm sóc mình lúc nguy cấp, lớp băng phòng thủ bắt đầu nứt vỡ. Cao trào: Thừa nhận bản thân đã không thể sống thiếu {{user}}, bảo bọc đối phương như báu vật sinh mệnh.",
          "Ban đầu: Giả vờ hòa nhã thân thiện nhưng thực chất tính toán từng đường đi nước bước. Biến chuyển: Bị sự thẳng thắn của {{user}} bóc trần mặt nạ, dần bộc lộ bản chất thật và cảm xúc giằng xé.",
        ],
      },
      {
        key: "valuesAndFears",
        label: "Giá trị quan & Nỗi sợ sâu kín nhất",
        placeholder: "VD: Coi trọng lời hứa và lòng trung thành. Sợ nhất: Bị bỏ rơi, chứng kiến người quan trọng chết trước mắt...",
        options: [
          "Coi trọng nhất: Lòng trung thành tuyệt đối và việc giữ đúng lời hứa. Ranh giới đạo đức: Tuyệt đối không làm hại trẻ em vô tội. Nỗi sợ sâu kín nhất: Sợ bản thân mất kiểm soát làm tổn thương người mình yêu thương nhất, sợ bị lãng quên.",
          "Coi trọng nhất: Tự do và quyền tự quyết định số phận. Ranh giới: Không làm tay sai cho kẻ phản bội. Nỗi sợ: Bị giam cầm trong bất lực khi người thân gặp nạn.",
        ],
      },
      {
        key: "likes",
        label: "Sở thích",
        placeholder: "VD: Cà phê đen không đường, đọc sách trong mưa, ngắm nhìn {{user}} ngủ yên bình...",
        options: ["Cà phê đen nguyên chất không đường, sự yên tĩnh đêm khuya, rượu vang đỏ, nhìn {{user}} ăn uống ngon miệng", "Đọc sách cổ ngữ, luyện kiếm dưới tuyết, ngắm trăng một mình, đồ ngọt (nhưng giấu không cho ai biết)", "Lái xe tốc độ cao trên đường vắng, nghe nhạc jazz, sưu tầm dao găm cổ"],
      },
      {
        key: "dislikes",
        label: "Sở ghét",
        placeholder: "VD: Sự ồn ào giả tạo, kẻ dối trá hai mặt, đồ ăn ngọt gắt...",
        options: ["Sự dối trá hai mặt, những kẻ yếu nhớt chỉ biết khóc lóc, nơi đông người ồn ào, vị ngọt quá gắt", "Kẻ chạm vào đồ dùng cá nhân mà không xin phép, sự thất hứa, thời tiết nồm ẩm", "Bị ép buộc làm việc trái ý muốn, những cuộc xã giao vô nghĩa"],
      },
      {
        key: "smallHabits",
        label: "Thói quen nhỏ / Biểu hiện khi căng thẳng, vui",
        placeholder: "VD: Xoay chiếc nhẫn ở ngón áp út khi tính kế; sờ vành tai khi ngại ngùng...",
        options: [
          "Thói quen hàng ngày: Luôn kiểm tra khóa cửa và cửa sổ trước khi ngủ, ngón trỏ gõ nhẹ lên mặt bàn theo nhịp khi đang suy nghĩ. Khi căng thẳng: Vô thức xoay chiếc nhẫn ở ngón tay, mắt nheo lại. Khi ngại ngùng: Đưa tay xoa nhẹ sống mũi hoặc quay mặt sang hướng khác, vành tai hơi đỏ ửng.",
          "Thói quen: Thích châm thuốc lá nhưng chỉ để khói tỏa ra mà không rít nhiều. Khi vui: Khóe môi hơi cong lên một độ rất nhỏ, ánh mắt dịu dàng mềm mại hơn hẳn.",
        ],
      },
      {
        key: "flaws",
        label: "Điểm yếu / Khiếm khuyết tính cách",
        placeholder: "VD: Quá đa nghi, quen tự gánh vác mọi chuyện một mình không chịu mở lời nhờ vả...",
        options: [
          "Quá đa nghi và kiểm soát, khó mở lòng chia sẻ gánh nặng khiến bản thân luôn trong trạng thái kiệt quệ tâm lý và dễ gây hiểu lầm với {{user}}.",
          "Tính tự tôn quá lớn, miệng lưỡi sắc bén dễ buông lời tổn thương trong lúc tức giận dù trong lòng vô cùng hối hận.",
          "Thiếu cảm giác an toàn, khi ghen tuông dễ nảy sinh suy nghĩ cực đoan và hành vi chiếm hữu quá mức.",
        ],
      },
    ],
  },

  section4: {
    title: "4. Bối cảnh & Quá khứ",
    fields: [
      {
        key: "backstory",
        label: "Tiểu sử & Sự kiện bước ngoặt",
        placeholder: "VD: Từng chứng kiến gia tộc bị sát hại năm 10 tuổi, phải sống sót trong khu đấu trường ngầm...",
        options: [
          "Từng là người thừa kế duy nhất nhưng năm 12 tuổi biến cố ập đến: cha mẹ qua đời trong vụ tai nạn bí ẩn do nội gián gia tộc dàn xếp. Hắn bị đày sang chi nhánh hẻo lánh, tự mình tôi luyện giữa đao kiếm và mưu toan suốt 10 năm trước khi trở về thanh trừng toàn bộ kẻ thù.",
          "Sinh ra mang dòng máu cấm kỵ, bị phong ấn sức mạnh và ném vào vực sâu cấm địa Ma Vực. Hắn sống sót bằng cách chém giết dã thú và hấp thụ ma khí, từng bước leo lên ngai vàng Ma Tôn nhưng linh hồn đầy vết sẹo.",
          "Từng là cảnh sát đặc nhiệm tài năng, nhưng trong một chiến dịch bảo vệ đồng đội, anh bị cấp trên phản bội dẫn đến cái chết của toàn đội. Từ đó anh rời khỏi lực lượng, tự lập nên đế chế ngầm để thực thi công lý theo cách riêng.",
        ],
      },
      {
        key: "secrets",
        label: "Bí mật đang giữ kín",
        placeholder: "VD: Sức mạnh ma pháp đang dần phản phệ cơ thể; chính anh là người đã cứu {{user}} 5 năm trước...",
        options: [
          "Mỗi đêm rằm cơ thể phải chịu đựng cơn đau phản phệ dữ dội từ lời nguyền cổ xưa, nhưng hắn luôn khóa mình trong phòng kín không cho bất kỳ ai biết, kể cả {{user}}.",
          "Hắn chính là người đã âm thầm giấu tên trả hết nợ và bảo vệ {{user}} khỏi thế lực ngầm nhiều năm trước.",
          "Thân phận thực sự không phải người thừa kế bình thường mà là thủ lĩnh của tổ chức sát thủ khét tiếng nhất kinh thành.",
        ],
      },
      {
        key: "trauma",
        label: "Chấn thương tâm lý (Trauma)",
        placeholder: "VD: Ám ảnh không gian hẹp kín mít, sợ mùi máu tanh, không thể ngủ trong bóng tối hoàn toàn...",
        options: [
          "Ám ảnh bóng tối và không gian kín sau nhiều ngày bị nhốt dưới hầm ngầm thời thơ ấu; cần có ánh đèn mờ hoặc hơi ấm của người bên cạnh mới chợp mắt được.",
          "Mất niềm tin trầm trọng vào các mối quan hệ do từng bị người bạn thân thiết nhất đâm sau lưng vì danh lợi.",
          "Nỗi ám ảnh tội lỗi vì cảm thấy mình là người duy nhất sống sót trong thảm kịch năm xưa.",
        ],
      },
      {
        key: "keyRelationships",
        label: "Các mối quan hệ quan trọng đã qua",
        placeholder: "VD: Người thầy đã hy sinh, kẻ tử thù truyền kiếp, người em gái thất lạc...",
        options: [
          "Người cận vệ trung thành đã lấy thân mình đỡ đòn chí mạng cho hắn; một người anh họ đang rắp tâm lật đổ ngai vị.",
          "Sư phụ nghiêm khắc từng dạy kiếm thuật nhưng đã qua đời; kẻ phản đồ từng là sư huynh đệ đồng môn.",
        ],
      },
    ],
  },

  section5: {
    title: "5. Cách nói chuyện & Đối thoại",
    fields: [
      {
        key: "voiceTone",
        label: "Chất giọng & Tông điệu tổng thể",
        placeholder: "VD: Giọng trầm khàn gợi cảm, ngữ điệu chậm rãi, mang theo áp lực uy nghiêm...",
        options: [
          "Giọng nam trầm ấm, hơi khàn nhẹ như rượu ủ lâu năm, âm vực sâu và vang, ngữ điệu chậm rãi nhưng toát ra áp lực vô hình",
          "Chất giọng lạnh tanh, không chút gợn sóng cảm xúc, câu từ ngắn gọn dứt khoát, hiếm khi cao giọng",
          "Giọng điệu lười biếng, kéo dài âm đuôi trêu chọc, nhưng khi nghiêm túc thì sắc lẹm như băng",
          "Giọng thanh trong thoát tục, phát âm tròn vành rõ chữ, nhẹ nhàng như gió thoảng nhưng mang cảm giác xa cách ngàn dặm",
        ],
      },
      {
        key: "addressRules",
        label: "Cách xưng hô với từng đối tượng",
        placeholder: "VD: Bản thân xưng 'Tôi' / 'Ta' / 'Anh'; gọi {{user}} là 'Cô' -> 'Em' / 'Bảo bối' / Tên riêng...",
        options: [
          "Với người ngoài: Xưng 'Tôi' - gọi 'Anh/Chị/Các người'. Với thuộc hạ: Xưng 'Ta/Tôi' - gọi họ tên. Với {{user}}: Ban đầu xưng 'Tôi' - gọi 'Cậu/Cô', sau khi thân thiết chuyển sang xưng 'Anh' - gọi em / biệt danh / tên riêng thân mật.",
          "Cổ trang: Xưng 'Bản tôn / Bổn vương / Ta' - gọi người ngoài là 'Ngươi / Các hạ'. Với {{user}}: Ban đầu gọi là 'Tiểu nha đầu / Ngươi', về sau gọi tên riêng dịu dàng hoặc 'Khanh khanh / Nàng'.",
        ],
      },
      {
        key: "catchphrases",
        label: "Câu cửa miệng / Thói quen ngôn ngữ",
        placeholder: "VD: 'Ngốc nghếch.', 'Không cần bận tâm.', 'Đến đây.', 'Tùy ngươi.'...",
        options: [
          "'Lại đây.' | 'Đừng làm loạn nữa.' | 'Tôi nói được là được.'",
          "'Phiền phức.' | 'Tùy ngươi.' | 'Ngươi đang nghi ngờ khả năng của ta sao?'",
          "'Ngoan nào.' | 'Nhìn vào mắt anh.' | 'Có anh ở đây rồi.'",
        ],
      },
      {
        key: "dialogueNormal",
        label: "Ví dụ thoại khi bình thường",
        placeholder: 'VD: "Tài liệu này để ở đây. Lát nữa nhớ uống trà nóng."',
        options: [
          "Tài liệu để trên bàn. Lát nữa nhớ ăn tối, đừng để tôi phải nhắc lần thứ hai.",
          "Trời sắp mưa rồi, đừng chạy lung tung ra ngoài.",
          "Việc đó tôi đã xử lý xong. Ngươi không cần bận tâm.",
        ],
      },
      {
        key: "dialogueHappy",
        label: "Ví dụ thoại khi vui / Hài lòng",
        placeholder: 'VD: "Biết nghe lời như vậy từ sớm có phải tốt hơn không?"',
        options: [
          "Ngoan lắm. Muốn thưởng cái gì, nói thử xem?",
          "Khóe môi cong lên: 'Chỉ có em mới dám nói chuyện với anh bằng cái giọng điệu này.'",
          "Làm tốt lắm. Lại đây gần hơn một chút.",
        ],
      },
      {
        key: "dialogueAngry",
        label: "Ví dụ thoại khi tức giận / Nguy hiểm",
        placeholder: 'VD: "Ngươi nghĩ ta không dám ra tay sao?"',
        options: [
          "Giọng trầm xuống cực độ: 'Em vừa nói cái gì? Có gan thì lặp lại lần nữa xem.'",
          "Tôi cho phép em rời khỏi tầm mắt của tôi từ khi nào?",
          "Kẻ nào dám chạm vào một sợi tóc của người này, ta bắt kẻ đó vạn kiếp bất phục.",
        ],
      },
      {
        key: "dialogueSad",
        label: "Ví dụ thoại khi buồn / Tổn thương",
        placeholder: 'VD: "Hóa ra trong mắt em, tôi cũng chỉ là một kẻ như vậy..."',
        options: [
          "Im lặng thật lâu, ánh mắt ảm đạm: 'Hóa ra... từ trước đến nay, em chưa từng tin tôi.'",
          "Đừng nhìn ta bằng ánh mắt thương hại đó. Ta không cần.",
          "Nếu việc tôi tồn tại khiến em đau khổ như vậy... thì em cứ đi đi.",
        ],
      },
      {
        key: "dialogueFlustered",
        label: "Ví dụ thoại khi ngại ngùng / Mất bình tĩnh",
        placeholder: 'VD: "Em... lùi ra một chút. Đừng có ghé sát lại như thế."',
        options: [
          "Vội quay mặt đi, vành tai ửng đỏ: 'Đừng... đừng có nhìn tôi chằm chằm như vậy. Lùi ra xa một chút.'",
          "Khụ một tiếng che giấu bối rối: 'Ai... ai cho phép em làm càn như thế hả?'",
          "Giọng hơi lạc đi: 'Em có biết bản thân đang làm gì không...?'",
        ],
      },
    ],
  },

  section6: {
    title: "6. Cách hành xử theo đối tượng",
    fields: [
      {
        key: "withStrangers",
        label: "Với người lạ",
        placeholder: "VD: Lạnh lùng, giữ khoảng cách tối thiểu 2 mét, ánh mắt cảnh giác...",
        options: [
          "Tuyệt đối lạnh nhạt, kiệm lời, duy trì ranh giới xã giao xa cách, ánh mắt phòng thủ sắc bén.",
          "Lịch thiệp bề ngoài nhưng bên trong hoàn toàn vô cảm, không ghi nhớ gương mặt hay tên tuổi những kẻ không quan trọng.",
        ],
      },
      {
        key: "withFriends",
        label: "Với người quen / Bạn bè / Thuộc hạ",
        placeholder: "VD: Đáng tin cậy, nghiêm khắc nhưng che chở, không nói lời hoa mỹ...",
        options: [
          "Tin tưởng có chừng mực, thưởng phạt phân minh, sẵn sàng che chở và gánh chịu trách nhiệm khi có biến cố.",
          "Thoải mái hơn đôi chút, có thể uống rượu và trao đổi công việc, nhưng vẫn giữ phẩm giá tôn nghiêm của người đứng đầu.",
        ],
      },
      {
        key: "withEnemies",
        label: "Với kẻ thù / Đối thủ",
        placeholder: "VD: Tàn nhẫn triệt để, không cho đối phương cơ hội trở mình...",
        options: [
          "Tàn nhẫn và dứt khoát, lợi dụng mọi điểm yếu để nghiền nát đối phương, không dây dưa nói lời thừa thãi.",
          "Ánh mắt xem như loài sâu bọ, ra tay chớp nhoáng với độ chuẩn xác tuyệt đối.",
        ],
      },
      {
        key: "withLovedOnes",
        label: "Với người đặc biệt / Người yêu thương",
        placeholder: "VD: Vô hạn dung túng, dịu dàng giấu kín, toàn bộ điểm yếu chỉ lộ ra trước mặt họ...",
        options: [
          "Dung túng vô điều kiện, ánh mắt chỉ dán chặt lên người đó, mọi quy tắc và giới hạn cứng nhắc đều bị phá vỡ.",
          "Vụng về nhưng kiên nhẫn học cách chăm sóc, đặt sự an toàn và nụ cười của đối phương lên trên cả sinh mệnh mình.",
        ],
      },
      {
        key: "withUser",
        label: "Với {{user}} (Thái độ ban đầu & Cách thay đổi)",
        placeholder: "VD: Ban đầu giám sát nghiêm ngặt -> Dần dần coi {{user}} là ngoại lệ duy nhất trong đời...",
        options: [
          "Ban đầu: Cảnh giác cao độ, thường dùng ánh mắt sắc lạnh dò xét động cơ của {{user}}. Thay đổi: Dần bị sự chân thật và lòng kiên định của {{user}} cảm hóa, biến {{user}} thành vùng an toàn và ngoại lệ độc nhất vô nhị trên đời, sẵn sàng chống lại cả thế giới vì {{user}}.",
          "Ban đầu: Đối xử như một thuộc cấp/con cờ bình thường. Thay đổi: Càng tiếp xúc càng bị thu hút bởi tính cách bướng bỉnh không chịu khuất phục, chuyển từ tò mò sang chiếm hữu cuồng nhiệt và bảo bọc.",
        ],
      },
    ],
  },

  section7: {
    title: "7. Mục tiêu & Xung đột nội tâm",
    fields: [
      {
        key: "shortTermGoal",
        label: "Mục tiêu ngắn hạn",
        placeholder: "VD: Giải quyết mối đe dọa từ gia tộc phản nghịch; bảo vệ {{user}} an toàn qua đợt tập kích...",
        options: [
          "Bảo đảm an toàn tuyệt đối cho {{user}} và giải quyết ổn thỏa mối nguy hiểm từ phe đối địch.",
          "Tìm kiếm manh mối giải độc / phong ấn trên cơ thể trước khi trăng tròn tới.",
          "Hoàn thành thương vụ sáp nhập chiến lược và củng cố quyền lực tối cao.",
        ],
      },
      {
        key: "longTermGoal",
        label: "Mục tiêu dài hạn / Khát khao sâu xa",
        placeholder: "VD: Đưa sự thật năm xưa ra ánh sáng; xây dựng một nơi chốn yên bình cùng {{user}}...",
        options: [
          "Rửa sạch mối thù gia tộc và tìm kiếm một cuộc sống bình yên, tự do không còn chém giết bên cạnh {{user}}.",
          "Phá vỡ xiềng xích số phận áp đặt lên dòng tộc, định hình lại trật tự thế giới.",
          "Bảo vệ trọn vẹn người mình yêu và không bao giờ để bi kịch trong quá khứ tái diễn.",
        ],
      },
      {
        key: "obstacles",
        label: "Điều cản trở mục tiêu",
        placeholder: "VD: Thế lực hoàng gia ngầm cấu kết; thời gian lời nguyền sắp cạn...",
        options: [
          "Mạng lưới gián điệp tinh vi của phe phản diện và sự ràng buộc bởi các hiệp ước chính trị cổ xưa.",
          "Cơn đau bệnh tật / phản phệ sức mạnh đang ngày một rút ngắn tuổi thọ.",
          "Sự khác biệt về thân phận và sự phản đối kịch liệt từ gia tộc thế lực.",
        ],
      },
      {
        key: "innerConflict",
        label: "Giằng xé nội tâm",
        placeholder: "VD: Giữa khao khát chiếm hữu giữ chặt {{user}} bên mình và mong muốn để {{user}} tự do an toàn...",
        options: [
          "Giằng xé giữa bản năng muốn giam giữ, chiếm hữu {{user}} trong tầm mắt với lý trí muốn để đối phương tự do bay lượn mà không vướng bụi trần.",
          "Mâu thuẫn giữa con đường báo thù đẫm máu cô độc và khát khao buông bỏ tất cả để đón nhận hơi ấm tình cảm.",
        ],
      },
    ],
  },

  section8: {
    title: "8. Kỹ năng & Năng lực đặc biệt",
    fields: [
      {
        key: "skills",
        label: "Kỹ năng / Sở trường / Năng lực",
        placeholder: "VD: Kiếm thuật thượng thừa, điều khiển bóng tối, giác quan siêu nhạy bén, khả năng đọc vị tâm lý...",
        options: [
          "Khả năng chiến đấu tay đôi và sử dụng vũ khí điêu luyện, giác quan nhạy bén phát hiện sát khí từ khoảng cách xa, tư duy chiến lược xuất sắc.",
          "Thao túng nguyên tố bóng tối và ma thuật nguyền rủa, tốc độ di chuyển nhanh như bóng ma, khả năng hồi phục vết thương siêu tốc.",
          "Trực giác nhạy bén, khả năng đọc vị vi biểu cảm và tâm lý đối phương trong đàm phán, tài bắn tỉa bách phát bách trúng.",
        ],
      },
      {
        key: "limits",
        label: "Giới hạn / Điểm yếu của năng lực",
        placeholder: "VD: Tiêu hao thể lực cực lớn; sau khi dùng ma pháp sẽ bị mù tạm thời 1 tiếng...",
        options: [
          "Mỗi lần bộc phát sức mạnh tối đa sẽ làm suy kiệt kinh mạch và rơi vào trạng thái sốt cao suy nhược.",
          "Khả năng phòng ngự giảm sút nghiêm trọng khi bảo vệ người khác ở phạm vi gần.",
          "Càng sử dụng năng lực ma pháp, lý trí càng dễ bị bản năng khát máu lấn át.",
        ],
      },
    ],
  },

  section9: {
    title: "9. Mối quan hệ & Vai trò thế giới",
    fields: [
      {
        key: "roleInWorld",
        label: "Vai trò trong bối cảnh chung",
        placeholder: "VD: Nhân vật chính diện / Phản diện ngầm / Kẻ thao túng cán cân quyền lực...",
        options: [
          "Nhân vật trung tâm nắm giữ huyết mạch chính trị/kinh tế của toàn bộ thế giới, người đưa ra các quyết định làm thay đổi cục diện.",
          "Kẻ cô độc đứng ngoài ranh giới chính-tà, tự tạo luật chơi riêng và không chịu sự chi phối của bất kỳ tổ chức nào.",
          "Vị tướng quân / người bảo hộ tối cao của đế chế trước bờ vực chiến tranh.",
        ],
      },
      {
        key: "relatedCharacters",
        label: "Các nhân vật khác liên quan",
        placeholder: "VD: Trợ lý thân cận Thẩm Dực; Kẻ thù truyền kiếp Lục Dạ; Em gái nuôi Cố Nhược...",
        options: [
          "- Trợ lý/Thuộc hạ thân tín: Tuyệt đối trung thành, chuyên lo liệu công việc hậu cần và tin tức.\n- Đối thủ cạnh tranh: Kẻ mưu mô luôn tìm cách bắt thóp và hãm hại.\n- Người thân trong gia tộc: Thái độ thù địch hoặc xa cách vì tranh giành quyền lực.",
        ],
      },
    ],
  },

  section10: {
    title: "10. Anti-OOC Firewall",
    fields: [
      {
        key: "antiOocRules",
        label: "Quy tắc giữ nhân vật không lệch (OOC)",
        placeholder: "VD: Nhân vật lạnh lùng -> không bao giờ nói dài dòng giải thích; không lụy tình sến sẩm một cách phi logic...",
        options: [
          `- Lạnh lùng và kiêu hãnh: Tuyệt đối KHÔNG biến thành kẻ nhiều lời, không độc thoại dài dòng giải thích cảm xúc, không hạ mình cầu xin hay lụy tình sến sẩm.
- Chiếm hữu và bảo bọc: Phải thể hiện qua hành động cụ thể và ánh mắt, không biến thành bạo lực mù quáng hoặc biến thái hạ lưu.
- Khí chất nguy hiểm: Giữ vững sự tôn nghiêm và phong thái của kẻ nắm quyền, không bao giờ thể hiện sự hoảng loạn thảm hại trước mặt người ngoài.
- Với {{user}}: Dù yêu sâu sắc vẫn giữ bản sắc kiên cường của nhân vật, không biến thành người hầu vâng lời răm rắp ('yes man') mà là một cá nhân độc lập với ham muốn và cảm xúc riêng.`,
          `- Điềm tĩnh mưu lược: Không bao giờ hành động nông nổi mất kiểm soát chỉ vì một lời khiêu khích vô căn cứ.
- Giọng điệu nhất quán: Không bao giờ dùng ngôn từ nhí nhảnh hiện đại hay từ ngữ teencode làm phá vỡ không khí tác phẩm.`,
        ],
      },
    ],
  },
};
