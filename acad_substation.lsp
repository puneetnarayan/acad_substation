;;; ACAD_SUBSTATION starter generator
;;; Load with APPLOAD; run ACAD_SUBSTATION and select panels CSV.
;;; CSV fields: Panel_ID,Panel_Type,Service,Lineup_Order,Width_mm,Depth_mm,Height_mm,Gap_After_mm,Front_Access_mm,Rear_Access_mm,Draw
;;; Prototype only: panel footprints and labels; room/openings/dimensions/bus ducts are not implemented yet.
(vl-load-com)
(defun acs:split (s d / p out)
  (while (setq p (vl-string-search d s))
    (setq out (cons (substr s 1 p) out)
          s (substr s (+ p 2))))
  (reverse (cons s out)))
(defun acs:num (s def) (if (and s (/= s "") (distof s 2)) (distof s 2) def))
(defun c:ACAD_SUBSTATION (/ path fh line a id w dep gap x y p1 p2 txt count)
  (setq path (getfiled "Select panels CSV" "" "csv" 0))
  (if path
    (progn
      (setq x (getreal "\nLineup start X in mm <1500>: "))
      (if (null x) (setq x 1500.0))
      (setq y (getreal "\nLineup start Y in mm <5000>: "))
      (if (null y) (setq y 5000.0))
      (setq gap (getreal "\nDefault gap in mm <10>: "))
      (if (null gap) (setq gap 10.0))
      (setq count 0 fh (open path "r"))
      (if fh
        (progn
          (read-line fh) ; skip header
          (while (setq line (read-line fh))
            (setq a (acs:split line ","))
            (if (>= (length a) 7)
              (progn
                (setq id (nth 0 a)
                      w (acs:num (nth 4 a) 800.0)
                      dep (acs:num (nth 5 a) 1200.0))
                (if (and (> w 0) (> dep 0) (/= (strcase (nth 10 a)) "NO"))
                  (progn
                    (setq p1 (list x y 0.0)
                          p2 (list (+ x w) (+ y dep) 0.0))
                    (command "_.RECTANG" p1 p2)
                    (setq txt (list (+ x (/ w 2.0)) (+ y (/ dep 2.0)) 0.0))
                    (command "_.TEXT" "_J" "_MC" txt 150 0 id)
                    (setq x (+ x w (acs:num (nth 7 a) gap))
                          count (1+ count)))))))
          (close fh)
          (princ (strcat "\nCreated " (itoa count) " panel footprints."))
        )
        (princ "\nCould not open CSV file.")
      )
    )
  )
  (princ)
)
(princ "\nACAD_SUBSTATION loaded. Run ACAD_SUBSTATION to start.")
(princ)
